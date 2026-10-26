package com.screener.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Registers the JWT bearer scheme so Swagger UI's "Authorize" button
 * can actually exercise the protected routes (almost every controller but AuthController
 * requires a Bearer token), not just render their schemas read-only.
 */
@Configuration
public class OpenApiConfig {

    private static final String BEARER_SCHEME = "bearerAuth";

    @Bean
    public OpenAPI screenerOpenApi() {
        return new OpenAPI()
                .info(new Info()
                        .title("Enterprise AI Prompt Screener API")
                        .version("v1")
                        .description("Screens prompts for sensitive data and prompt-injection risk "
                                + "before they reach a local Ollama model."))
                .addSecurityItem(new SecurityRequirement().addList(BEARER_SCHEME))
                .components(new Components().addSecuritySchemes(BEARER_SCHEME, new SecurityScheme()
                        .type(SecurityScheme.Type.HTTP)
                        .scheme("bearer")
                        .bearerFormat("JWT")));
    }
}
