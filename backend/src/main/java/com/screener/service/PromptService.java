package com.screener.service;

import com.screener.detection.DecisionResult;
import com.screener.detection.DetectionEngine;
import com.screener.detection.PolicyDecisionEngine;
import com.screener.detection.RiskAnalysisEngine;
import com.screener.detection.RiskScorer;
import com.screener.detection.RiskSignalResult;
import com.screener.detection.RiskSubScoreCalculator;
import com.screener.detection.RiskSubScores;
import com.screener.dto.PromptHistoryItemDto;
import com.screener.dto.PromptResponseDto;
import com.screener.config.SystemConfigValues;
import com.screener.model.Decision;
import com.screener.model.DetectionFinding;
import com.screener.model.PromptRequest;
import com.screener.model.PromptStatus;
import com.screener.model.Role;
import com.screener.model.RiskSignal;
import com.screener.model.ScreeningDecision;
import com.screener.model.SystemConfig;
import com.screener.model.UserRole;
import com.screener.repository.DetectionFindingRepository;
import com.screener.repository.PromptRequestRepository;
import com.screener.repository.RiskSignalRepository;
import com.screener.repository.RoleRepository;
import com.screener.repository.ScreeningDecisionRepository;
import com.screener.repository.SystemConfigRepository;
import com.screener.repository.UserRoleRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Full screening pipeline (todo.md Phase 13): normalise -> detect -> analyse risk ->
 * score -> decide -> mask -> persist, then either send straight to the AI (ALLOW) or
 * wait for the user's explicit confirm ({@link #confirmAndSend}).
 */
@Service
@RequiredArgsConstructor
public class PromptService {

    private static final Logger log = LoggerFactory.getLogger(PromptService.class);

    // Public: AdminService (Phase 20.3) reads/writes these same keys and defaults.
    public static final String MAX_LENGTH_CONFIG_KEY = "max_prompt_length";
    public static final int DEFAULT_MAX_LENGTH = 2000;
    public static final String POLICY_VERSION_CONFIG_KEY = "policy_version";
    public static final int DEFAULT_POLICY_VERSION = 1;

    // 41.5: ALLOWED is confirmable so a prompt whose AI call failed can be retried. A
    // successful ALLOW advances to COMPLETED immediately (13.5b), so the only rows left
    // sitting in ALLOWED are ones whose gateway call threw - exactly the rows 13.8 intended
    // to leave "where they were ... for a retry", which until now no code path could finish.
    private static final Set<PromptStatus> CONFIRMABLE_STATUSES =
            Set.of(PromptStatus.MASKED, PromptStatus.PENDING_CONFIRM, PromptStatus.ALLOWED);

    private final PromptRequestRepository promptRequestRepository;
    private final SystemConfigRepository systemConfigRepository;
    private final DetectionFindingRepository detectionFindingRepository;
    private final RiskSignalRepository riskSignalRepository;
    private final ScreeningDecisionRepository screeningDecisionRepository;
    private final UserRoleRepository userRoleRepository;
    private final RoleRepository roleRepository;

    private final DetectionEngine detectionEngine;
    private final RiskAnalysisEngine riskAnalysisEngine;
    private final RiskSubScoreCalculator riskSubScoreCalculator;
    private final RiskScorer riskScorer;
    private final PolicyDecisionEngine policyDecisionEngine;
    private final MaskingService maskingService;
    private final AiGatewayService aiGatewayService;
    private final ResponseSafetyChecker responseSafetyChecker;
    private final AuditService auditService;

    public PromptResponseDto processPrompt(String rawText, Long userId) {
        String normalised = normalise(rawText);

        if (normalised.isBlank()) {
            throw new IllegalArgumentException("Prompt text cannot be blank");
        }

        int maxLength = resolveMaxLength();
        if (normalised.length() > maxLength) {
            throw new IllegalArgumentException(
                    "Prompt exceeds the maximum allowed length of " + maxLength + " characters");
        }

        UUID requestId = UUID.randomUUID();
        String role = resolveRole(userId);

        // Steps 2-5 only (13.4) - excludes normalise (1), masking (6), and any AI call.
        long pipelineStartMs = System.currentTimeMillis();
        List<DetectionFinding> findings = detectionEngine.detectAll(normalised);
        List<RiskSignalResult> signals = riskAnalysisEngine.analyze(normalised, userId);
        RiskSubScores subScores = riskSubScoreCalculator.compute(findings, signals, role, normalised.length());
        double riskScore = riskScorer.score(subScores);
        DecisionResult decisionResult = policyDecisionEngine.decide(riskScore, findings, signals);
        long processingTimeMs = System.currentTimeMillis() - pipelineStartMs;
        logDecisionOutcome(requestId, decisionResult, findings.size(), signals.size(), processingTimeMs);

        // 13.1: mask whenever there are any findings at all, regardless of decision, so a
        // REVIEW/BLOCK prompt still has a masked copy for the reviewer/audit trail.
        String maskedText = findings.isEmpty() ? null : maskingService.getMaskedPreview(normalised, findings);

        PromptRequest promptRequest = new PromptRequest();
        promptRequest.setRequestId(requestId);
        promptRequest.setUserId(userId);
        promptRequest.setPromptText(normalised);
        promptRequest.setPromptHash(sha256Hex(normalised));
        promptRequest.setMaskedText(maskedText);
        promptRequest.setStatus(statusFor(decisionResult.decision()));
        promptRequest.setSubmittedAt(LocalDateTime.now());
        promptRequestRepository.save(promptRequest);

        saveFindings(requestId, findings);
        saveSignals(requestId, signals);
        saveDecision(requestId, decisionResult, processingTimeMs);

        // 17.2: one event for the intake itself, one for the decision outcome. The
        // decision's action is always decision.name() (ALLOW/MASK/CONFIRM/REVIEW/BLOCK) -
        // this is what satisfies 17.2's "prompt blocked"/"prompt masked" as well as the
        // BLOCK/REVIEW literals Phase 10.8's repeated-attack-pattern query depends on,
        // without special-casing any one decision.
        auditService.log(userId, "SUBMITTED", requestId, decisionResult.decision().name());
        auditService.log(userId, decisionResult.decision().name(), requestId, decisionResult.decision().name());

        // 13.5b: ALLOW forwards the unmodified text immediately, in this same call - not
        // deferred to /confirm. If AiGatewayService throws, it propagates uncaught (13.8):
        // the row above is already saved as ALLOWED, but never advances to COMPLETED.
        if (decisionResult.decision() == Decision.ALLOW) {
            sendToAiAndComplete(promptRequest, findings, decisionResult.decision().name());
        }

        return toDto(promptRequest, decisionResult.decision().name(), decisionResult.explanation(), riskScore);
    }

    public PromptResponseDto confirmAndSend(UUID requestId, Long userId) {
        PromptRequest promptRequest = promptRequestRepository.findByRequestId(requestId)
                .orElseThrow(() -> new NoSuchElementException("Prompt request not found"));

        if (!promptRequest.getUserId().equals(userId)) {
            throw new AccessDeniedException("You do not have access to this prompt request");
        }
        if (!CONFIRMABLE_STATUSES.contains(promptRequest.getStatus())) {
            throw new IllegalStateException("Prompt request is not awaiting confirmation");
        }

        ScreeningDecision decision = screeningDecisionRepository.findByRequestId(requestId)
                .orElseThrow(() -> new NoSuchElementException("Screening decision not found"));
        List<DetectionFinding> findings = detectionFindingRepository.findByRequestId(requestId);

        log.info("Prompt {} confirmed by user {}, forwarding to AI gateway", requestId, userId);

        // 13.7: MASK/CONFIRM forward the masked text, never the raw text.
        // 41.5: an ALLOWED row only reaches this endpoint because its original AI call failed.
        // It forwards the same raw text the ALLOW path itself would have sent (13.5b) - note
        // an ALLOW prompt can still carry findings and therefore a non-null maskedText (13.1
        // masks whenever there is any finding, whatever the decision), so reusing the masked
        // branch here would silently send different text on the retry than on the first try.
        String textToSend = promptRequest.getStatus() == PromptStatus.ALLOWED
                ? promptRequest.getPromptText()
                : textToForward(promptRequest);
        sendToAiAndComplete(promptRequest, textToSend, findings, decision.getDecision().name());

        return toDto(promptRequest, decision.getDecision().name(), decision.getExplanation(), decision.getRiskScore());
    }

    // 18.3: reviewer approves (or marks FALSE_POSITIVE) a PENDING_REVIEW prompt. Forwards
    // the masked text, same as /confirm (13.7) - except when there are no findings at all
    // to mask (13.1 only masks when findings exist), in which case the raw text is safe
    // to forward as-is since nothing sensitive was ever detected in it. This is the one
    // case where todo.md 18.3's "the already-masked text ... now guarantees it exists"
    // doesn't literally hold - see docs/NOTE.md.
    public PromptResponseDto approveFromReview(UUID requestId) {
        PromptRequest promptRequest = requirePendingReview(requestId);
        ScreeningDecision decision = requireDecision(requestId);
        List<DetectionFinding> findings = detectionFindingRepository.findByRequestId(requestId);

        log.info("Prompt {} approved from review, forwarding to AI gateway", requestId);

        sendToAiAndComplete(promptRequest, textToForward(promptRequest), findings, decision.getDecision().name());

        return toDto(promptRequest, decision.getDecision().name(), decision.getExplanation(), decision.getRiskScore());
    }

    // 41.1: masked text is null whenever DetectionEngine found zero entities - which happens
    // even on MASK/CONFIRM/REVIEW, since those can be reached by risk score or by a hard
    // override (11.2.3) with no finding to mask. Forwarding it unguarded put a null into
    // AiGatewayService.send and 500'd, stranding the prompt with no way to proceed. Falling
    // back to the raw text is safe by construction: "no masked version exists" and "nothing
    // sensitive was detected to mask" are the same condition.
    private String textToForward(PromptRequest promptRequest) {
        return promptRequest.getMaskedText() != null
                ? promptRequest.getMaskedText()
                : promptRequest.getPromptText();
    }

    // 18.3: reviewer rejects (or requests correction) - never reaches AiGatewayService.
    public PromptResponseDto rejectFromReview(UUID requestId) {
        PromptRequest promptRequest = requirePendingReview(requestId);
        ScreeningDecision decision = requireDecision(requestId);

        log.warn("Prompt {} rejected from review, marking BLOCKED", requestId);
        promptRequest.setStatus(PromptStatus.BLOCKED);
        promptRequestRepository.save(promptRequest);

        return toDto(promptRequest, decision.getDecision().name(), decision.getExplanation(), decision.getRiskScore());
    }

    // 19.1: paginated, masked-text-only history for the caller's own prompts. Batches the
    // ScreeningDecision lookup for the whole page instead of one query per row.
    public Page<PromptHistoryItemDto> getMyHistory(Long userId, Pageable pageable) {
        Page<PromptRequest> page = promptRequestRepository.findByUserId(userId, pageable);
        List<UUID> requestIds = page.getContent().stream().map(PromptRequest::getRequestId).toList();
        Map<UUID, ScreeningDecision> decisionsByRequestId = screeningDecisionRepository.findByRequestIdIn(requestIds)
                .stream()
                .collect(Collectors.toMap(ScreeningDecision::getRequestId, decision -> decision));
        return page.map(promptRequest -> toHistoryItem(promptRequest, decisionsByRequestId.get(promptRequest.getRequestId())));
    }

    // 19.2: ownership-checked single lookup - reuses PromptResponseDto, which already
    // never carries raw prompt text (same shape /submit and /confirm return).
    public PromptResponseDto getMyPromptDetails(UUID requestId, Long userId) {
        PromptRequest promptRequest = promptRequestRepository.findByRequestId(requestId)
                .orElseThrow(() -> new NoSuchElementException("Prompt request not found"));
        if (!promptRequest.getUserId().equals(userId)) {
            throw new AccessDeniedException("You do not have access to this prompt request");
        }
        ScreeningDecision decision = screeningDecisionRepository.findByRequestId(requestId).orElse(null);
        String decisionName = decision != null ? decision.getDecision().name() : null;
        String explanation = decision != null ? decision.getExplanation() : null;
        Double riskScore = decision != null ? decision.getRiskScore() : null;
        return toDto(promptRequest, decisionName, explanation, riskScore);
    }

    private PromptHistoryItemDto toHistoryItem(PromptRequest promptRequest, ScreeningDecision decision) {
        return new PromptHistoryItemDto(
                promptRequest.getRequestId(),
                promptRequest.getSubmittedAt(),
                promptRequest.getStatus().name(),
                decision != null ? decision.getDecision().name() : null,
                decision != null ? decision.getRiskScore() : null,
                decision != null ? decision.getExplanation() : null,
                promptRequest.getMaskedText());
    }

    private PromptRequest requirePendingReview(UUID requestId) {
        PromptRequest promptRequest = promptRequestRepository.findByRequestId(requestId)
                .orElseThrow(() -> new NoSuchElementException("Prompt request not found"));
        if (promptRequest.getStatus() != PromptStatus.PENDING_REVIEW) {
            throw new IllegalStateException("Prompt request is not awaiting review");
        }
        return promptRequest;
    }

    private ScreeningDecision requireDecision(UUID requestId) {
        return screeningDecisionRepository.findByRequestId(requestId)
                .orElseThrow(() -> new NoSuchElementException("Screening decision not found"));
    }

    private void sendToAiAndComplete(PromptRequest promptRequest, List<DetectionFinding> findings, String riskBand) {
        sendToAiAndComplete(promptRequest, promptRequest.getPromptText(), findings, riskBand);
    }

    // Shared by both the ALLOW path (13.5b) and /confirm (13.7). If aiGatewayService.send
    // throws, it propagates to the caller uncaught - promptRequest is never saved as
    // COMPLETED (13.8).
    private void sendToAiAndComplete(PromptRequest promptRequest, String textToSend,
                                      List<DetectionFinding> findings, String riskBand) {
        log.debug("Prompt {} forwarding to AI gateway (riskBand={})", promptRequest.getRequestId(), riskBand);
        String aiResponse = aiGatewayService.send(textToSend);
        auditService.log(promptRequest.getUserId(), "SENT_TO_AI", promptRequest.getRequestId(), riskBand);

        SafetyCheckResult safetyResult = responseSafetyChecker.check(
                aiResponse, promptRequest.getPromptText(), findings,
                promptRequest.getRequestId(), promptRequest.getUserId(), riskBand);

        promptRequest.setAiResponse(safetyResult.responseText());
        promptRequest.setStatus(PromptStatus.COMPLETED);
        promptRequest.setCompletedAt(LocalDateTime.now());
        promptRequestRepository.save(promptRequest);
    }

    // 40.2: entity/signal counts and the decision only - never the prompt text or any
    // finding value. WARN for the two decisions that stop a prompt from reaching the AI
    // model unmodified (BLOCK/REVIEW), INFO for the rest.
    private void logDecisionOutcome(UUID requestId, DecisionResult decisionResult, int findingCount,
                                     int signalCount, long processingTimeMs) {
        Decision decision = decisionResult.decision();
        String message = "Prompt {} screened: decision={} riskScore={} findings={} signals={} tookMs={}";
        Object[] args = {requestId, decision, decisionResult.riskScore(), findingCount, signalCount, processingTimeMs};
        if (decision == Decision.BLOCK || decision == Decision.REVIEW) {
            log.warn(message, args);
        } else {
            log.info(message, args);
        }
    }

    private void saveFindings(UUID requestId, List<DetectionFinding> findings) {
        for (DetectionFinding finding : findings) {
            finding.setRequestId(requestId);
        }
        detectionFindingRepository.saveAll(findings);
    }

    private void saveSignals(UUID requestId, List<RiskSignalResult> signals) {
        List<RiskSignal> entities = signals.stream().map(signal -> {
            RiskSignal entity = new RiskSignal();
            entity.setRequestId(requestId);
            entity.setSignalType(signal.type());
            entity.setWeight(signal.weight());
            entity.setEvidenceSpan(signal.evidenceSpan());
            return entity;
        }).toList();
        riskSignalRepository.saveAll(entities);
    }

    private void saveDecision(UUID requestId, DecisionResult decisionResult, long processingTimeMs) {
        ScreeningDecision decision = new ScreeningDecision();
        decision.setRequestId(requestId);
        decision.setDecision(decisionResult.decision());
        decision.setRiskScore(decisionResult.riskScore());
        decision.setExplanation(decisionResult.explanation());
        decision.setPolicyVersion(resolvePolicyVersion());
        decision.setTimestamp(LocalDateTime.now());
        decision.setProcessingTimeMs(processingTimeMs);
        screeningDecisionRepository.save(decision);
    }

    private PromptStatus statusFor(Decision decision) {
        return switch (decision) {
            case ALLOW -> PromptStatus.ALLOWED;
            case MASK -> PromptStatus.MASKED;
            case CONFIRM -> PromptStatus.PENDING_CONFIRM;
            case REVIEW -> PromptStatus.PENDING_REVIEW;
            case BLOCK -> PromptStatus.BLOCKED;
        };
    }

    private String resolveRole(Long userId) {
        Set<String> roleNames = userRoleRepository.findByUserId(userId).stream()
                .map(UserRole::getRoleId)
                .map(roleRepository::findById)
                .filter(java.util.Optional::isPresent)
                .map(java.util.Optional::get)
                .map(Role::getName)
                .collect(Collectors.toSet());
        return Role.mostPrivileged(roleNames);
    }

    // Phase 27.3/27.4: riskScore and entityTypes ride along on every PromptResponseDto so
    // the frontend result screen can render the score bar + entity chips regardless of
    // which call site produced the response (submit/confirm/review-decide/history-detail).
    private PromptResponseDto toDto(PromptRequest promptRequest, String decisionName, String explanation, Double riskScore) {
        return new PromptResponseDto(
                promptRequest.getRequestId(),
                promptRequest.getStatus().name(),
                decisionName,
                explanation,
                promptRequest.getMaskedText(),
                promptRequest.getAiResponse(),
                riskScore,
                entityTypesFor(promptRequest.getRequestId()));
    }

    // Entity type labels only - never raw values, matching ReviewDetailsDto's (18.5) same
    // pattern of exposing what was found without exposing the sensitive value itself.
    private List<String> entityTypesFor(UUID requestId) {
        return detectionFindingRepository.findByRequestId(requestId).stream()
                .map(finding -> finding.getEntityType().name())
                .distinct()
                .toList();
    }

    private String normalise(String text) {
        String withUnixLineEndings = text.trim().replace("\r\n", "\n").replace("\r", "\n");
        return stripUnsafeControlChars(withUnixLineEndings);
    }

    // Strips only C0/DEL control characters (except \n and \t) — deliberately leaves
    // zero-width/unicode-spacing characters untouched so RiskAnalysisEngine's Obfuscation
    // Signal check (Phase 10.7) still sees them.
    private String stripUnsafeControlChars(String text) {
        StringBuilder cleaned = new StringBuilder(text.length());
        for (int i = 0; i < text.length(); i++) {
            char c = text.charAt(i);
            boolean isUnsafeControl = (c < 0x20 && c != '\n' && c != '\t') || c == 0x7F;
            if (!isUnsafeControl) {
                cleaned.append(c);
            }
        }
        return cleaned.toString();
    }

    // 42.3: both fall back to the documented default (with a WARN) rather than throwing on a
    // hand-edited, non-numeric config row - which previously broke every submission.
    private int resolveMaxLength() {
        return systemConfigRepository.findByConfigKey(MAX_LENGTH_CONFIG_KEY)
                .map(SystemConfig::getConfigValue)
                .map(value -> SystemConfigValues.parseInt(MAX_LENGTH_CONFIG_KEY, value, DEFAULT_MAX_LENGTH))
                .orElse(DEFAULT_MAX_LENGTH);
    }

    private int resolvePolicyVersion() {
        return systemConfigRepository.findByConfigKey(POLICY_VERSION_CONFIG_KEY)
                .map(SystemConfig::getConfigValue)
                .map(value -> SystemConfigValues.parseInt(POLICY_VERSION_CONFIG_KEY, value, DEFAULT_POLICY_VERSION))
                .orElse(DEFAULT_POLICY_VERSION);
    }

    private String sha256Hex(String text) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(text.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder(hash.length * 2);
            for (byte b : hash) {
                hex.append(String.format("%02x", b));
            }
            return hex.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 algorithm not available", e);
        }
    }
}
