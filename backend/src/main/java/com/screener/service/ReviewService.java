package com.screener.service;

import com.screener.dto.PromptResponseDto;
import com.screener.dto.ReviewDetailsDto;
import com.screener.dto.ScoreBreakdownDto;
import com.screener.dto.ReviewQueueItemDto;
import com.screener.model.PromptRequest;
import com.screener.model.PromptStatus;
import com.screener.model.ReviewAction;
import com.screener.model.ReviewRecord;
import com.screener.model.RiskSignal;
import com.screener.model.ScreeningDecision;
import com.screener.repository.DetectionFindingRepository;
import com.screener.repository.PromptRequestRepository;
import com.screener.repository.ReviewRecordRepository;
import com.screener.repository.RiskSignalRepository;
import com.screener.repository.ScreeningDecisionRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Set;
import java.util.UUID;

/**
 * Human review workflow (todo.md Phase 18). Owns the review queue, review-details view,
 * and {@link ReviewRecord} persistence; delegates the actual "forward to AI" / "block"
 * side effect to {@link PromptService#approveFromReview} / {@link PromptService#rejectFromReview}
 * so the AiGatewayService+ResponseSafetyChecker forwarding logic stays in one place
 * (shared with the ALLOW path and /confirm, per Phase 13/15/16).
 *
 * <p>{@code REQUEST_CORRECTION} is treated the same as {@code REJECT} (never reaches the
 * AI gateway, status becomes BLOCKED) and {@code FALSE_POSITIVE} the same as
 * {@code APPROVE} (forwarded to the AI gateway) - todo.md 18.2/18.3 only spell out
 * behaviour for APPROVE/REJECT explicitly, and {@link PromptStatus} has no third
 * "returned for correction" state to represent anything else. Documented assumption, see
 * docs/NOTE.md.
 */
@Service
@RequiredArgsConstructor
public class ReviewService {

    private static final Logger log = LoggerFactory.getLogger(ReviewService.class);

    private static final Set<ReviewAction> APPROVING_ACTIONS = Set.of(ReviewAction.APPROVE, ReviewAction.FALSE_POSITIVE);

    private final PromptRequestRepository promptRequestRepository;
    private final ScreeningDecisionRepository screeningDecisionRepository;
    private final DetectionFindingRepository detectionFindingRepository;
    private final RiskSignalRepository riskSignalRepository;
    private final ReviewRecordRepository reviewRecordRepository;
    private final PromptService promptService;
    private final AuditService auditService;

    public List<ReviewQueueItemDto> getQueue() {
        return promptRequestRepository.findByStatusOrderBySubmittedAtAsc(PromptStatus.PENDING_REVIEW).stream()
                .map(this::toQueueItem)
                .toList();
    }

    public ReviewDetailsDto getDetails(UUID requestId) {
        PromptRequest promptRequest = promptRequestRepository.findByRequestId(requestId)
                .orElseThrow(() -> new NoSuchElementException("Prompt request not found"));
        ScreeningDecision decision = screeningDecisionRepository.findByRequestId(requestId)
                .orElseThrow(() -> new NoSuchElementException("Screening decision not found"));

        List<String> entityTypes = entityTypesFor(requestId);
        List<String> matchedSignals = riskSignalRepository.findByRequestId(requestId).stream()
                .map(RiskSignal::getSignalType)
                .map(Enum::name)
                .distinct()
                .toList();

        return new ReviewDetailsDto(requestId, reviewerVisibleText(promptRequest), entityTypes,
                decision.getRiskScore(), matchedSignals, decision.getExplanation(),
                ScoreBreakdownDto.from(decision));
    }

    public PromptResponseDto decide(UUID requestId, Long reviewerId, ReviewAction action, String reason) {
        log.info("Reviewer {} decided {} on prompt {}", reviewerId, action, requestId);

        // 42.2: the forward used to run first with the record and audit event after it, so an
        // AiGatewayException (Ollama down or timed out - a documented, recurring event on this
        // machine) propagated before either was written. The reviewer had genuinely acted, yet
        // the decision left no trace at all: "a reviewer clicked Approve" and "a ReviewRecord
        // exists" were not equivalent, which quietly undermines the audit trail the project
        // claims. The record is now persisted on the failure path too, before rethrowing.
        //
        // Deliberately still forward-first on the happy path: the record then carries the
        // decision the forward actually produced. On failure the prompt correctly stays
        // PENDING_REVIEW and can simply be re-decided once Ollama is back - which will write a
        // second record, an honest history of two attempts rather than a rewritten single one.
        PromptResponseDto result;
        try {
            result = APPROVING_ACTIONS.contains(action)
                    ? promptService.approveFromReview(requestId)
                    : promptService.rejectFromReview(requestId);
        } catch (RuntimeException ex) {
            log.warn("Reviewer {}'s {} decision on prompt {} could not be completed - recording the "
                    + "decision anyway so it is not lost, prompt stays awaiting review", reviewerId, action, requestId);
            saveReviewRecord(requestId, reviewerId, action, reason);
            auditService.log(reviewerId, "REVIEWER_" + action.name(), requestId, null);
            throw ex;
        }

        saveReviewRecord(requestId, reviewerId, action, reason);
        auditService.log(reviewerId, "REVIEWER_" + action.name(), requestId, result.decision());

        return result;
    }

    // 18.4: the raw prompt text only when there is no masked version to show instead -
    // which only happens when detection found nothing to mask (13.1), meaning the raw
    // text itself contains no sensitive findings by definition.
    private String reviewerVisibleText(PromptRequest promptRequest) {
        return promptRequest.getMaskedText() != null ? promptRequest.getMaskedText() : promptRequest.getPromptText();
    }

    private void saveReviewRecord(UUID requestId, Long reviewerId, ReviewAction action, String reason) {
        ReviewRecord record = new ReviewRecord();
        record.setRequestId(requestId);
        record.setReviewerId(reviewerId);
        record.setAction(action);
        record.setReason(reason);
        record.setTimestamp(LocalDateTime.now());
        reviewRecordRepository.save(record);
    }

    private ReviewQueueItemDto toQueueItem(PromptRequest promptRequest) {
        ScreeningDecision decision = screeningDecisionRepository.findByRequestId(promptRequest.getRequestId())
                .orElse(null);
        Double riskScore = decision != null ? decision.getRiskScore() : null;
        String explanation = decision != null ? decision.getExplanation() : null;
        return new ReviewQueueItemDto(promptRequest.getRequestId(), promptRequest.getUserId(),
                promptRequest.getSubmittedAt(), riskScore, explanation, entityTypesFor(promptRequest.getRequestId()));
    }

    private List<String> entityTypesFor(UUID requestId) {
        return detectionFindingRepository.findByRequestId(requestId).stream()
                .map(finding -> finding.getEntityType().name())
                .distinct()
                .toList();
    }
}
