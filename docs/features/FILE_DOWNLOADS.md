# File Downloads Feature

**Version:** v0.4.0-alpha.3  
**Status:** ✅ Implemented  
**Layer:** Infrastructure  
**Pattern:** Functional + Auto-Detection

---

## Overview

SyntroJS provides **three progressive levels** of abstraction for handling file downloads, from explicit control to automatic detection. All approaches follow functional programming principles with guard clauses for security.

---

## Architecture

### Design Principles

**SOLID:**
- **Single Responsibility:** `createFileDownload()` only prepares downloads (no file I/O)
- **Open/Closed:** Extensible MIME type detection without modifying core
- **Dependency Inversion:** Works with abstractions (Buffer/Stream), not concrete implementations

**DDD:**
- **Layer:** Infrastructure (HTTP protocol details)
- **Pure Function:** No state, no mutations, no side effects
- **Immutable:** Returns new objects, never modifies inputs

**Security:**
- **Guard Clauses:** Path traversal protection, filename validation
- **Fail-Fast:** Throws BadRequestException on invalid input
- **Sanitization:** Escapes special characters in filenames

---

## API Reference

### Level 1: Explicit API (Maximum Control)

```typescript
import { SyntroJS, createFileDownload } from 'syntrojs';

app.get('/download/report', {
  handler: async () => {
    const buffer = await generatePDF();
    
    return createFileDownload(buffer, {
      filename: 'report.pdf',
      mimeType: 'application/pdf',  // Optional: auto-detected
      disposition: 'attachment'      // Optional: default is 'attachment'
    });
  }
});
```

**When to use:**
- Maximum clarity and control
- Explicit about what's happening
- Easier to debug and trace

---

### Level 2: Context Helper (Ergonomic)

```typescript
app.get('/download/users', {
  handler: async ({ download }) => {
    const csv = await generateUserCSV();
    
    return download(csv, { filename: 'users.csv' });
  }
});
```

**When to use:**
- Ergonomic API without imports
- Quick prototyping
- Cleaner handler code

---

### Level 3: Auto-Detection (Maximum DX)

```typescript
app.get('/download/invoice', {
  handler: async () => {
    return {
      data: await getPDFBuffer(),
      headers: {
        'Content-Disposition': 'attachment; filename="invoice.pdf"',
        'Content-Type': 'application/pdf'
      },
      statusCode: 200
    };
  }
});
```

**When to use:**
- Maximum flexibility
- Custom headers needed
- Advanced use cases

---

## Function Signature

```typescript
function createFileDownload(
  data: Buffer | Readable | string,
  options: {
    filename: string;              // Required
    mimeType?: string;             // Optional: auto-detected
    disposition?: 'attachment' | 'inline';  // Optional: default 'attachment'
  }
): {
  data: Buffer | Readable | string;
  headers: Record<string, string>;
  statusCode: number;
}
```

---

## MIME Type Detection

Auto-detects from file extension (case-insensitive):

| Category | Extensions | MIME Type |
|----------|-----------|-----------|
| **Documents** | pdf, doc, docx, xls, xlsx, ppt, pptx | application/* |
| **Images** | jpg, jpeg, png, gif, svg, webp, ico | image/* |
| **Video** | mp4, webm, avi, mov | video/* |
| **Audio** | mp3, wav, ogg | audio/* |
| **Text** | txt, html, css, js, json, xml, csv | text/* or application/json |
| **Archives** | zip, tar, gz, rar, 7z | application/* |
| **Unknown** | * | application/octet-stream |

---

## Security Features

### Path Traversal Protection

```typescript
// ❌ REJECTED: Filename with path separators
download(buffer, { filename: 'path/to/file.pdf' });
// → Throws: "Filename must not contain path separators"

// ❌ REJECTED: Directory traversal
download(buffer, { filename: '../etc/passwd' });
// → Throws: "Filename must not contain .. (directory traversal)"

// ✅ SAFE: Plain filename
download(buffer, { filename: 'report.pdf' });
```

### Filename Sanitization

```typescript
// Quotes are escaped automatically
download(buffer, { filename: 'file"with"quotes.txt' });
// → Content-Disposition: attachment; filename="file\"with\"quotes.txt"
```

### User Input Safety

**⚠️ NEVER use user input directly for filenames:**

```typescript
// ❌ DANGEROUS
app.get('/download', {
  handler: ({ query, download }) => {
    return download(buffer, { filename: query.name }); // UNSAFE!
  }
});

// ✅ SAFE - Sanitize first
app.get('/download', {
  handler: ({ query, download }) => {
    const safeFilename = sanitizeUserInput(query.name);
    return download(buffer, { filename: safeFilename });
  }
});

function sanitizeUserInput(input: string): string {
  return input
    .replace(/[/\\]/g, '')         // Remove path separators
    .replace(/\.\./g, '')          // Remove directory traversal
    .replace(/[^a-zA-Z0-9._-]/g, '_'); // Only safe characters
}
```

---

## Use Cases

### 1. PDF Report Generation

```typescript
app.get('/reports/:month', {
  handler: async ({ params, download }) => {
    const pdf = await generateMonthlyReport(params.month);
    return download(pdf, { filename: `report-${params.month}.pdf` });
  }
});
```

### 2. CSV Data Export

```typescript
app.get('/export/users', {
  handler: async ({ download }) => {
    const users = await db.users.findAll();
    const csv = convertToCSV(users);
    return download(csv, { filename: 'users.csv' });
  }
});
```

### 3. Image Preview (Inline)

```typescript
app.get('/preview/:imageId', {
  handler: async ({ params, download }) => {
    const image = await storage.getImage(params.imageId);
    return download(image, {
      filename: 'preview.jpg',
      disposition: 'inline'  // Display in browser
    });
  }
});
```

### 4. Streaming Large Files

```typescript
import { createReadStream } from 'fs';

app.get('/download/large-video', {
  handler: ({ download }) => {
    const stream = createReadStream('./videos/large-file.mp4');
    return download(stream, { filename: 'video.mp4' });
  }
});
```

### 5. Dynamic Downloads from S3/Storage

```typescript
app.get('/files/:fileId', {
  dependencies: {
    s3: { factory: getS3Client, scope: 'singleton' }
  },
  handler: async ({ params, dependencies, download }) => {
    const file = await dependencies.s3.getObject({
      Bucket: 'my-bucket',
      Key: params.fileId
    });
    
    return download(file.Body, {
      filename: file.Metadata.filename,
      mimeType: file.ContentType
    });
  }
});
```

---

## Testing

### Unit Tests (Pure Function)

```typescript
import { createFileDownload } from 'syntrojs';
import { describe, test, expect } from 'vitest';

test('creates file download with correct headers', () => {
  const buffer = Buffer.from('test');
  const result = createFileDownload(buffer, { filename: 'test.pdf' });
  
  expect(result.headers['Content-Type']).toBe('application/pdf');
  expect(result.headers['Content-Disposition']).toBe('attachment; filename="test.pdf"');
});

test('rejects path traversal attempts', () => {
  expect(() => 
    createFileDownload(Buffer.from('test'), { filename: '../etc/passwd' })
  ).toThrow('directory traversal');
});
```

### E2E Tests (Full Integration)

```typescript
import { TinyTest } from 'syntrojs/testing';

test('downloads file with correct headers', async () => {
  const api = new TinyTest();
  
  api.get('/download', {
    handler: ({ download }) => 
      download(Buffer.from('test'), { filename: 'file.txt' })
  });
  
  const response = await api.request('GET', '/download');
  
  expect(response.status).toBe(200);
  expect(response.headers.get('content-disposition')).toContain('file.txt');
  
  await api.close();
});
```

---

## Functional Programming Benefits

### Pure Function

```typescript
// Same input = Same output (deterministic)
const result1 = createFileDownload(buffer, options);
const result2 = createFileDownload(buffer, options);

expect(result1).toEqual(result2); // Values are equal
expect(result1).not.toBe(result2); // But different objects (immutable)
```

### No Side Effects

```typescript
const buffer = Buffer.from('original');
const options = { filename: 'file.txt' };

createFileDownload(buffer, options);

// Inputs are unchanged
expect(buffer.toString()).toBe('original');
expect(options).toEqual({ filename: 'file.txt' });
```

### Immutability

```typescript
// Data is passed through, not copied
const stream = createReadStream('./large-file.mp4');
const result = createFileDownload(stream, { filename: 'video.mp4' });

expect(result.data).toBe(stream); // Same reference (efficient)
```

---

## Performance Considerations

### Buffer vs Stream

**Use Buffer when:**
- ✅ Small files (< 10MB)
- ✅ Data already in memory
- ✅ Need to process entire file

**Use Stream when:**
- ✅ Large files (> 10MB)
- ✅ Reading from disk/network
- ✅ Memory efficiency important

```typescript
// Buffer: Good for small files
app.get('/small', {
  handler: ({ download }) => {
    const buffer = await readFile('./small.pdf');
    return download(buffer, { filename: 'small.pdf' });
  }
});

// Stream: Good for large files
app.get('/large', {
  handler: ({ download }) => {
    const stream = createReadStream('./large-video.mp4');
    return download(stream, { filename: 'video.mp4' });
  }
});
```

---

## Dual Runtime Support

Works identically on both Node.js and Bun:

```typescript
// Same code works on both runtimes
app.get('/download', {
  handler: ({ download }) => 
    download(Buffer.from('test'), { filename: 'file.txt' })
});

// Run with Node.js
node app.js  // ✅ Works

// Run with Bun
bun app.js   // ✅ Works (3.8x faster)
```

---

## Common Patterns

### CSV Export from Database

```typescript
app.get('/export/data.csv', {
  dependencies: { db: { factory: getDB, scope: 'singleton' } },
  handler: async ({ dependencies, download }) => {
    const rows = await dependencies.db.query('SELECT * FROM users');
    const csv = rows.map(r => `${r.id},${r.name},${r.email}`).join('\n');
    return download(csv, { filename: 'export.csv' });
  }
});
```

### Conditional Download vs Preview

```typescript
app.get('/file/:id', {
  handler: async ({ params, query, download }) => {
    const file = await getFile(params.id);
    
    return download(file.buffer, {
      filename: file.name,
      disposition: query.preview ? 'inline' : 'attachment'
    });
  }
});
```

### Timestamped Backups

```typescript
app.get('/backup', {
  handler: async ({ download }) => {
    const data = await exportDatabase();
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    
    return download(data, { 
      filename: `backup-${timestamp}.json` 
    });
  }
});
```

---

## Migration from Plain Buffer/Stream

**Before (v0.3.x):**

```typescript
app.get('/download', {
  handler: () => {
    // Returns buffer without headers
    return Buffer.from('file content');
  }
});
// ❌ No Content-Disposition header
// ❌ Browser might display instead of download
```

**After (v0.4.0+):**

```typescript
app.get('/download', {
  handler: ({ download }) => {
    return download(Buffer.from('file content'), { 
      filename: 'file.txt' 
    });
  }
});
// ✅ Content-Disposition header set
// ✅ Proper download behavior
```

---

## Error Handling

All validation errors throw `BadRequestException` (400):

```typescript
// Missing data
download(null, { filename: 'file.txt' });
// → BadRequestException: "File data is required for download"

// Missing filename
download(buffer, {});
// → BadRequestException: "Filename is required and must be a string"

// Invalid filename
download(buffer, { filename: '../etc/passwd' });
// → BadRequestException: "Filename must not contain .. (directory traversal)"

// Invalid disposition
download(buffer, { filename: 'file.txt', disposition: 'invalid' });
// → BadRequestException: "Disposition must be either 'attachment' or 'inline'"
```

---

## Implementation Details

### File Location

- **Core:** `src/infrastructure/FileDownloadHelper.ts`
- **Integration:** `src/infrastructure/FastifyAdapter.ts` (Node.js)
- **Integration:** `src/infrastructure/BunAdapter.ts` (Bun)
- **Types:** `src/domain/types.ts` (RequestContext.download)

### Exports

```typescript
// Public API
export { createFileDownload, isFileDownloadResponse } from 'syntrojs';

// Types
export type { FileDownloadOptions, FileDownloadResponse } from 'syntrojs';
```

### Detection Priority

Response handling order in adapters:

1. **FileDownloadResponse** (has Content-Disposition) ⚡ NEW
2. Stream (Readable)
3. Buffer
4. RouteResponse (status + body + headers)
5. JSON (default)

---

## Testing Coverage

### Unit Tests

**File:** `tests/unit/FileDownloadHelper.test.ts`

- ✅ All guard clauses (8 tests)
- ✅ Happy paths (Buffer, Stream, string)
- ✅ MIME type detection (30+ extensions)
- ✅ Immutability verification
- ✅ Functional programming principles
- ✅ Edge cases (special characters, unicode, long filenames)

### E2E Tests

**File:** `tests/universal/file-downloads-e2e.test.ts`

- ✅ All 3 API levels
- ✅ Different file types (PDF, CSV, images, video)
- ✅ Security tests (path traversal rejection)
- ✅ Data integrity (binary, large files, streams)
- ✅ Integration with DI, route config
- ✅ Real-world use cases

### Example

**File:** `syntrojs-examples/src/file-downloads-example.ts`

- 11 practical examples
- Security patterns
- Best practices

**Total Coverage:** 40+ tests

---

## Functional Programming Guarantees

### Pure Function

```typescript
// ✅ Deterministic: Same input → Same output
const result1 = createFileDownload(buffer, options);
const result2 = createFileDownload(buffer, options);
expect(result1).toEqual(result2);
```

### Immutability

```typescript
// ✅ No mutations: Inputs are unchanged
const buffer = Buffer.from('test');
createFileDownload(buffer, { filename: 'file.txt' });
expect(buffer.toString()).toBe('test'); // Unchanged
```

### No Side Effects

```typescript
// ✅ No I/O, no global state, no external calls
// Only pure transformations: input → output
```

---

## Comparison with Other Frameworks

### Express

```typescript
// Express: Manual headers
app.get('/download', (req, res) => {
  res.setHeader('Content-Disposition', 'attachment; filename="file.pdf"');
  res.setHeader('Content-Type', 'application/pdf');
  res.send(buffer);
});
```

### Fastify

```typescript
// Fastify: Manual headers
app.get('/download', async (request, reply) => {
  reply.header('Content-Disposition', 'attachment; filename="file.pdf"');
  reply.type('application/pdf');
  return buffer;
});
```

### SyntroJS

```typescript
// SyntroJS: One liner
app.get('/download', {
  handler: ({ download }) => download(buffer, { filename: 'file.pdf' })
});
```

**Result:**
- 🎯 3 lines → 1 line
- 🎯 Auto MIME type detection
- 🎯 Built-in security
- 🎯 Type-safe

---

## Future Enhancements

Planned for future versions:

- **Content-Range:** Partial downloads (HTTP 206)
- **ETags:** Cache validation
- **Compression:** Automatic gzip for large files
- **Resumable Downloads:** Range requests support

---

## References

- **RFC 6266:** Content-Disposition header spec
- **MIME Types:** https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types
- **Security:** OWASP Path Traversal prevention

