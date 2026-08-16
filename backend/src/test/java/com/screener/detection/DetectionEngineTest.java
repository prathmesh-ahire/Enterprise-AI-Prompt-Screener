package com.screener.detection;

import com.screener.model.DetectionFinding;
import com.screener.model.EntityType;
import com.screener.model.OrgConfidentialTerm;
import com.screener.repository.OrgConfidentialTermRepository;
import com.screener.repository.SystemConfigRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.lenient;

@ExtendWith(MockitoExtension.class)
class DetectionEngineTest {

    @Mock
    private SystemConfigRepository systemConfigRepository;

    @Mock
    private OrgConfidentialTermRepository orgConfidentialTermRepository;

    @Test
    void detectsExactlyOneOfEachNineCategories() {
        lenient().when(systemConfigRepository.findByConfigKey("disabled_detectors")).thenReturn(Optional.empty());

        OrgConfidentialTerm term = new OrgConfidentialTerm();
        term.setTerm("Project Chimera");
        term.setActive(true);
        lenient().when(orgConfidentialTermRepository.findByActiveTrue()).thenReturn(List.of(term));

        List<Detector> detectors = List.of(
                new EmailDetector(),
                new PhoneDetector(),
                new PanDetector(),
                new AadhaarDetector(),
                new PaymentCardDetector(),
                new ApiKeyDetector(),
                new PasswordDetector(),
                new PrivateKeyDetector(),
                new OrgConfidentialDetector(orgConfidentialTermRepository)
        );

        DetectionEngine engine = new DetectionEngine(detectors, systemConfigRepository);

        String prompt = String.join("\n",
                "Email me at jane.doe@example.com",
                "Call 9876543210 for details",
                "PAN: ABCPE1234F",
                "Aadhaar: 234567890124",
                "Card: 4111111111111111",
                "api_key=Zx9pQ7rT2vLm4wN8sK1dJh6",
                "password=Sup3rSecretValue!",
                "-----BEGIN RSA PRIVATE KEY-----",
                "MIIEpAIBAAKCAQEAxyzABCDEF1234567890abcdefGHIJKLMN==",
                "-----END RSA PRIVATE KEY-----",
                "This relates to Project Chimera internally"
        );

        List<DetectionFinding> findings = engine.detectAll(prompt);

        assertEquals(9, findings.size());
        Set<EntityType> foundTypes = findings.stream()
                .map(DetectionFinding::getEntityType)
                .collect(Collectors.toSet());
        assertEquals(Set.of(EntityType.values()), foundTypes);
    }
}
