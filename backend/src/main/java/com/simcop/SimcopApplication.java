package com.simcop;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class SimcopApplication {

	public static void main(String[] args) {
		SpringApplication.run(SimcopApplication.class, args);
	}

}
