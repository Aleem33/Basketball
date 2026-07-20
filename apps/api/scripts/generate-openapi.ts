import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { createApplication } from '../src/main';

async function main(): Promise<void> {
  const app = await createApplication();
  try {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle('Basketball Tournament Platform API')
        .setVersion('1.0')
        .addBearerAuth()
        .build(),
    );
    await writeFile(
      resolve(process.cwd(), '../../docs/openapi.json'),
      `${JSON.stringify(document, null, 2)}\n`,
      'utf8',
    );
  } finally {
    await app.close();
  }
}

void main();
