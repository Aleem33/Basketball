import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { format } from 'prettier';
import { createApplication } from '../src/main';

async function main(): Promise<void> {
  process.env.OPENAPI_GENERATION = 'true';
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
    const output = await format(JSON.stringify(document, null, 2), {
      parser: 'json',
      printWidth: 100,
    });
    await writeFile(resolve(process.cwd(), '../../docs/openapi.json'), output, 'utf8');
  } finally {
    await app.close();
  }
}

void main();
