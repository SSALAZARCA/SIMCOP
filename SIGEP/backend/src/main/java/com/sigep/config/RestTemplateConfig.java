package com.sigep.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestTemplate;

@Configuration
public class RestTemplateConfig {

    @Value("${simcop.client.connect-timeout:5000}")
    private int connectTimeout;

    @Value("${simcop.client.read-timeout:5000}")
    private int readTimeout;

    @Bean
    public RestTemplate restTemplate() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(connectTimeout > 0 ? connectTimeout : 5000);
        factory.setReadTimeout(readTimeout > 0 ? readTimeout : 5000);
        return new RestTemplate(factory);
    }
}
