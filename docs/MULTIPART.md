# Multipart Support (File Uploads)

> **Version:** 0.4.0  
> **Status:** ✅ Implemented  
> **Dual Runtime:** ✅ Node.js + Bun  

SyntroJS supports file uploads via multipart/form-data with automatic parsing for both Node.js and Bun runtimes.

---

## 🎯 Key Features

- ✅ **File Uploads** - Handle single or multiple files
- ✅ **Form Fields** - Mix files with regular form data
- ✅ **File Validation** - Size, type, extension validation
- ✅ **Dual Runtime** - Works on Node.js (Fastify) and Bun (Web API)
- ✅ **Type-Safe** - Full TypeScript types for files
- ✅ **SOLID Architecture** - Separate MultipartParser service
- ✅ **Zero Configuration** - Works out of the box

---

## 🏗️ Architecture (SOLID + DDD)

### **Separation of Concerns**

```
Application Layer (Business Logic)
├─ MultipartParser     - Parse multipart data
└─ FileValidator       - Validate files

Infrastructure Layer (Adapters)
├─ FastifyAdapter      - Calls MultipartParser.parseFastify()
├─ FluentAdapter       - Calls MultipartParser.parseFastify()
└─ BunAdapter          - Calls MultipartParser.parseBun()
```

**Dependency Inversion Principle:** Adapters depend on MultipartParser service (abstraction), not on concrete implementations.

### **Dual Runtime Strategy**

| Runtime | Implementation | API Used |
|---------|----------------|----------|
| **Node.js** | `@fastify/multipart` plugin | `request.parts()` |
| **Bun** | Native Web API | `request.formData()` |

**Result:** Same code, different runtime, zero configuration needed.

---

## 🚀 Quick Start

### Single File Upload

```typescript
import { SyntroJS } from 'syntrojs';

const app = new SyntroJS();

app.post('/upload', {
  handler: async ({ files }) => {
    if (!files || files.length === 0) {
      return { error: 'No file uploaded' };
    }
    
    const file = files[0];
    
    // Save to disk
    const buffer = await file.toBuffer();
    await fs.promises.writeFile(`./uploads/${file.filename}`, buffer);
    
    return {
      filename: file.filename,
      size: file.size,
      mimetype: file.mimetype
    };
  }
});

await app.listen(3000);
```

### Test it:

```bash
curl -X POST http://localhost:3000/upload \
  -F "file=@document.pdf"
```

---

## 📖 Usage Examples

### 1. Single File Upload

```typescript
app.post('/avatar', {
  handler: async ({ files }) => {
    const file = files?.[0];
    
    if (!file) {
      throw new BadRequestException('Avatar is required');
    }
    
    // Save avatar
    const buffer = await file.toBuffer();
    await saveToStorage(`avatars/${file.filename}`, buffer);
    
    return { url: `/avatars/${file.filename}` };
  }
});
```

### 2. Multiple Files Upload

```typescript
app.post('/photos', {
  handler: async ({ files }) => {
    if (!files || files.length === 0) {
      throw new BadRequestException('At least one photo required');
    }
    
    const saved = [];
    for (const file of files) {
      const buffer = await file.toBuffer();
      await saveToStorage(`photos/${file.filename}`, buffer);
      saved.push(file.filename);
    }
    
    return { uploaded: saved };
  }
});
```

### 3. File with Form Fields

```typescript
app.post('/document', {
  handler: async ({ files, fields }) => {
    const file = files?.[0];
    const title = fields?.title;
    const category = fields?.category;
    
    if (!file) throw new BadRequestException('Document required');
    if (!title) throw new BadRequestException('Title required');
    
    return {
      id: await saveDocument(file, title, category)
    };
  }
});
```

```bash
curl -X POST http://localhost:3000/document \
  -F "file=@report.pdf" \
  -F "title=Annual Report" \
  -F "category=financial"
```

### 4. File Validation

```typescript
import { FileValidator } from 'syntrojs';

app.post('/avatar', {
  handler: async ({ files }) => {
    const file = files?.[0];
    
    // Validate file constraints
    FileValidator.validate(file, {
      required: true,
      maxSize: 5 * 1024 * 1024, // 5MB
      allowedTypes: ['image/png', 'image/jpeg'],
      allowedExtensions: ['.png', '.jpg', '.jpeg']
    });
    
    // File is valid, save it
    const buffer = await file.toBuffer();
    await saveAvatar(buffer);
    
    return { success: true };
  }
});
```

### 5. Multiple Files Validation

```typescript
app.post('/photos', {
  handler: async ({ files }) => {
    // Validate all files at once
    FileValidator.validateMultiple(files, {
      required: true,
      maxFiles: 10,
      maxSize: 10 * 1024 * 1024, // 10MB per file
      allowedTypes: ['image/png', 'image/jpeg', 'image/webp']
    });
    
    // All files are valid
    return { uploaded: files.length };
  }
});
```

---

## 📦 UploadedFile Interface

```typescript
interface UploadedFile {
  /** Original filename from client */
  filename: string;

  /** MIME type (e.g., 'image/png') */
  mimetype: string;

  /** File encoding */
  encoding: string;

  /** File size in bytes */
  size: number;

  /** Form field name */
  fieldname: string;

  /** Readable stream of file data */
  data: Readable;

  /** Convert to Buffer (loads to memory) */
  toBuffer(): Promise<Buffer>;
}
```

### Access in Handler

```typescript
app.post('/upload', {
  handler: ({ files, fields }) => {
    // files: UploadedFile[] | undefined
    // fields: Record<string, string> | undefined
    
    const file = files?.[0];
    console.log(file?.filename);  // "document.pdf"
    console.log(file?.mimetype);  // "application/pdf"
    console.log(file?.size);      // 1048576 (bytes)
  }
});
```

---

## 🔧 File Operations

### Save to Disk

```typescript
import { writeFile } from 'node:fs/promises';

app.post('/upload', {
  handler: async ({ files }) => {
    const file = files![0];
    
    // Method 1: Using toBuffer()
    const buffer = await file.toBuffer();
    await writeFile(`./uploads/${file.filename}`, buffer);
    
    // Method 2: Using stream (better for large files)
    const writeStream = createWriteStream(`./uploads/${file.filename}`);
    file.data.pipe(writeStream);
    await new Promise((resolve, reject) => {
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });
    
    return { saved: file.filename };
  }
});
```

### Stream to Cloud Storage

```typescript
app.post('/upload/cloud', {
  handler: async ({ files }) => {
    const file = files![0];
    
    // Stream directly to S3/GCS/Azure
    const uploadStream = await cloudStorage.createUploadStream(file.filename);
    file.data.pipe(uploadStream);
    
    return { url: uploadStream.url };
  }
});
```

---

## 🧪 Testing

```typescript
import { TinyTest, FileValidator } from 'syntrojs/testing';

test('should upload file', async () => {
  const api = new TinyTest();
  
  api.post('/upload', {
    handler: ({ files }) => {
      FileValidator.validate(files?.[0], {
        required: true,
        maxSize: 1024 * 1024
      });
      
      return { uploaded: files![0].filename };
    }
  });

  // Note: TinyTest multipart request support coming soon
  
  await api.close();
});

test('file validator rejects large files', () => {
  const largeFile = {
    filename: 'huge.pdf',
    size: 100 * 1024 * 1024, // 100MB
    // ... other fields
  };

  expect(() => {
    FileValidator.validate(largeFile, { maxSize: 10 * 1024 * 1024 });
  }).toThrow('File too large');
});
```

---

## ⚙️ Configuration

### Fastify Adapter Limits

```typescript
// Default limits (set in FastifyAdapter.create())
{
  fileSize: 50 * 1024 * 1024, // 50MB max
  files: 10 // Max 10 files per request
}
```

### Custom Limits (Future)

```typescript
// Coming in future version
const app = new SyntroJS({
  multipart: {
    limits: {
      fileSize: 100 * 1024 * 1024, // 100MB
      files: 20
    }
  }
});
```

---

## 🎨 Comparison with FastAPI

### FastAPI (Python)

```python
from fastapi import File, UploadFile

@app.post("/upload")
async def upload(file: UploadFile = File(...)):
    contents = await file.read()
    return {"filename": file.filename}
```

### SyntroJS (TypeScript)

```typescript
app.post('/upload', {
  handler: async ({ files }) => {
    const file = files![0];
    const contents = await file.toBuffer();
    return { filename: file.filename };
  }
});
```

**Similar elegance, full type safety!** ✅

---

## 🔒 Security Best Practices

### 1. Always Validate File Size

```typescript
FileValidator.validate(file, {
  maxSize: 10 * 1024 * 1024 // 10MB - prevent DoS
});
```

### 2. Validate MIME Types

```typescript
FileValidator.validate(file, {
  allowedTypes: [
    'image/png',
    'image/jpeg',
    'application/pdf'
  ]
});
```

**Don't trust client MIME types!** Always verify file contents if critical.

### 3. Validate File Extensions

```typescript
FileValidator.validate(file, {
  allowedExtensions: ['.png', '.jpg', '.pdf']
});
```

### 4. Sanitize Filenames

```typescript
function sanitizeFilename(filename: string): string {
  // Remove path traversal attempts
  return filename
    .replace(/\.\./g, '')
    .replace(/[^a-zA-Z0-9.-]/g, '_');
}

app.post('/upload', {
  handler: async ({ files }) => {
    const file = files![0];
    const safeName = sanitizeFilename(file.filename);
    
    await saveFile(safeName, await file.toBuffer());
    return { saved: safeName };
  }
});
```

### 5. Use Virus Scanning

```typescript
app.post('/upload', {
  handler: async ({ files, background }) => {
    const file = files![0];
    
    // Save file first
    await saveFile(file.filename, await file.toBuffer());
    
    // Scan in background (don't block response)
    background.addTask(async () => {
      await virusScan(file.filename);
    });
    
    return { queued: file.filename };
  }
});
```

---

## 🚀 Performance

### Memory Usage

- **Small files (<1MB):** Loaded to memory via `toBuffer()` - Fast
- **Large files (>10MB):** Stream to disk via `file.data.pipe()` - Memory efficient

### Limits

- **Max file size:** 50MB default (configurable)
- **Max files:** 10 per request (configurable)
- **Total request size:** Limited by Fastify/Bun defaults

---

## 🎯 Implementation Details

### SOLID Principles Applied

**1. Single Responsibility**
- `MultipartParser` - Only parses multipart
- `FileValidator` - Only validates files
- Adapters - Only adapt runtime-specific APIs

**2. Dependency Inversion**
- Adapters depend on `MultipartParser` (abstraction)
- Not on `@fastify/multipart` or Bun's FormData directly

**3. Guard Clauses**
- All inputs validated before processing
- Fail fast on invalid data

**4. Functional Programming**
- `processFilePart()` - Pure function
- `processWebFile()` - Pure function
- No mutations of input data

### Dual Runtime Implementation

**Node.js (Fastify):**
```typescript
// Uses @fastify/multipart plugin
await MultipartParser.parseFastify(request, context);
// Calls request.parts() internally
```

**Bun:**
```typescript
// Uses Web API FormData
await MultipartParser.parseBun(request, context);
// Calls request.formData() internally
```

**Result:** Same `context.files` and `context.fields` on both runtimes!

---

## ⚠️ Limitations

### 1. TinyTest Multipart Support

Currently, TinyTest doesn't support multipart requests yet. Coming soon:

```typescript
// Future:
await api.request('POST', '/upload', {
  files: [{ path: './test.pdf', fieldname: 'document' }],
  fields: { title: 'Test Document' }
});
```

### 2. Streaming Uploads

Files are currently buffered to memory for `toBuffer()`. For very large files (>100MB), use streaming:

```typescript
app.post('/upload/large', {
  handler: async ({ files }) => {
    const file = files![0];
    
    // Stream directly to disk (don't use toBuffer())
    const writeStream = createWriteStream(`./uploads/${file.filename}`);
    await pipeline(file.data, writeStream);
    
    return { saved: file.filename };
  }
});
```

---

## 📚 Related Documentation

- [Streaming Support](./STREAMING.md) - For file downloads
- [File Validation](./FILE_VALIDATION.md) - Coming soon
- [File Downloads](./FILE_DOWNLOADS.md) - Coming soon

---

**Next Steps:**
- File downloads helper (uses streaming + multipart foundations)
- Static file serving
- Complete file upload examples

