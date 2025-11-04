import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { ReportModule } from "./report.module";

async function bootstrap() {
  const app = await NestFactory.create(ReportModule);

  app.setGlobalPrefix("api/v1");

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  );

  app.enableCors({ origin: true, credentials: true });

  const config = new DocumentBuilder()
    .setTitle("Bill Me - Report Service")
    .setDescription("Analytics and reporting microservice API")
    .setVersion("1.0")
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api/docs", app, document);

  const port = process.env.PORT || 3013;
  await app.listen(port);

  // eslint-disable-next-line no-console
  console.log(`🚀 Report Service is running on: http://localhost:${port}`);
  // eslint-disable-next-line no-console
  console.log(
    `📚 Swagger docs available at: http://localhost:${port}/api/docs`
  );
}

bootstrap();
