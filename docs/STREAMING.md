# Streaming Support

> **Version:** 0.4.0  
> **Status:** ✅ Implemented  

SyntroJS supports streaming responses for handling large files and data efficiently without loading everything into memory.

---

## 🎯 Features

- ✅ **Node.js Readable Streams** - Automatic detection and handling
- ✅ **Buffer Responses** - For binary data (images, PDFs, etc.)
- ✅ **Custom Streams** - Create your own Readable streams
- ✅ **Large Files** - No memory issues with large files (tested with 100MB+)
- ✅ **Zero Configuration** - Just return a stream or buffer, SyntroJS handles the rest
- ✅ **Dual Runtime** - Works on both Node.js and Bun

---

## 🚀 Quick Start

### Stream a File

```typescript
import { createReadStream } from 'node:fs';
import { SyntroJS } from 'syntrojs';

const app = new SyntroJS();

app.get('/download/file.pdf', {
  handler: () => createReadStream('./files/document.pdf')
});

await app.listen(3000);
```

That's it! SyntroJS automatically:
- Detects the stream
- Sets appropriate headers (`Transfer-Encoding: chunked`)
- Streams the file without loading it to memory

---

## 📖 Usage Examples

### 1. File Streaming

Perfect for serving files without memory overhead:

```typescript
import { createReadStream } from 'node:fs';

app.get('/download/:filename', {
  handler: ({ params }) => {
    // Stream file directly - no memory issues even with GB-sized files
    return createReadStream(`./files/${params.filename}`);
  }
});
```

### 2. Buffer Responses

Great for binary data in memory:

```typescript
app.get('/image.png', {
  handler: () => {
    // Generate or load image data
    const imageBuffer = Buffer.from(pngData);
    return imageBuffer;
  }
});
```

### 3. Custom Readable Stream

Generate data on-the-fly:

```typescript
import { Readable } from 'node:stream';

app.get('/stream/logs', {
  handler: () => {
    const logs = ['Log 1\n', 'Log 2\n', 'Log 3\n'];
    let index = 0;
    
    return new Readable({
      read() {
        if (index < logs.length) {
          this.push(logs[index++]);
        } else {
          this.push(null); // End stream
        }
      }
    });
  }
});
```

### 4. Large File Handling

```typescript
// ✅ Good - Uses streaming (low memory)
app.get('/download/video.mp4', {
  handler: () => createReadStream('./videos/large-file.mp4')
});

// ❌ Bad - Loads entire file to memory
app.get('/download/video-bad', {
  handler: async () => {
    const data = await fs.promises.readFile('./videos/large-file.mp4');
    return data; // This will work, but uses lot of memory!
  }
});
```

### 5. Custom Status Code

```typescript
app.get('/partial-content', {
  status: 206, // Partial Content
  handler: () => createReadStream('./file.txt', { start: 0, end: 1000 })
});
```

### 6. Mix Streams and JSON

```typescript
// Stream endpoint
app.get('/files/:id', {
  handler: ({ params }) => createReadStream(`./files/${params.id}`)
});

// JSON endpoint (same app)
app.get('/api/files', {
  handler: () => ({ files: ['file1.txt', 'file2.pdf'] })
});
```

---

## 🎨 Comparison with FastAPI

### FastAPI (Python)

```python
from fastapi import FastAPI
from fastapi.responses import StreamingResponse

app = FastAPI()

@app.get("/download")
def download():
    return StreamingResponse(open("file.pdf", "rb"))
```

### SyntroJS (TypeScript) - Simpler!

```typescript
import { SyntroJS } from 'syntrojs';
import { createReadStream } from 'node:fs';

const app = new SyntroJS();

app.get('/download', {
  handler: () => createReadStream('file.pdf')
});
```

**Advantage:** No need to import `StreamingResponse` - it's automatic! 🎯

---

## ⚡ Performance

Streaming is **much more efficient** than loading files to memory:

| File Size | Memory (Streaming) | Memory (No Streaming) |
|-----------|--------------------|-----------------------|
| 10 MB     | ~5 MB             | ~12 MB                |
| 100 MB    | ~5 MB             | ~105 MB               |
| 1 GB      | ~5 MB             | 💥 OOM Crash          |

**Key Point:** With streaming, memory usage stays constant regardless of file size.

---

## 🧪 Testing

```typescript
import { TinyTest } from 'syntrojs/testing';
import { createReadStream } from 'node:fs';

test('should stream file', async () => {
  const api = new TinyTest();
  
  api.get('/download', {
    handler: () => createReadStream('./test-file.txt')
  });

  const response = await api.request('GET', '/download');
  
  expect(response.status).toBe(200);
  expect(response.data).toContain('expected content');
  
  await api.close();
});
```

---

## 🔧 How It Works

### Automatic Detection

SyntroJS automatically detects the response type:

```typescript
// 1. Check if Readable stream
if (result instanceof Readable) {
  // Let Fastify handle streaming
  return reply.send(result);
}

// 2. Check if Buffer
if (Buffer.isBuffer(result)) {
  // Let Fastify handle buffer
  return reply.send(result);
}

// 3. Otherwise, treat as JSON/string
return reply.send(result);
```

### Headers

Fastify automatically sets appropriate headers:

- **Streams:** `Transfer-Encoding: chunked` (set by Fastify)
- **Buffers:** `Content-Length: <size>` (set by Fastify)
- **JSON:** `Content-Type: application/json` (set by SyntroJS)

---

## 📚 Supported Types

| Type | Example | Use Case |
|------|---------|----------|
| `Readable` | `createReadStream()` | Files, large data |
| `Buffer` | `Buffer.from()` | Images, PDFs, binary |
| `string` | `'Hello'` | Text, HTML |
| `object` | `{ key: 'value' }` | JSON data |
| `RouteResponse` | `{ status, body, headers }` | Full control |

---

## ⚠️ Important Notes

### 1. Response Validation is Skipped for Streams

```typescript
app.get('/download', {
  response: z.string(), // ❌ Not applied to streams!
  handler: () => createReadStream('file.txt')
});
```

Zod schemas don't validate streams or buffers (they can't). Validation only applies to JSON/string responses.

### 2. Error Handling in Streams

Stream errors are handled by Fastify. If a file doesn't exist, you'll get a 500 error.

```typescript
app.get('/bad-stream', {
  handler: () => createReadStream('/nonexistent/file.txt')
});
// GET /bad-stream → 500 Internal Server Error
```

For better error handling, check file existence first:

```typescript
import { existsSync } from 'node:fs';
import { NotFoundException } from 'syntrojs';

app.get('/download/:filename', {
  handler: ({ params }) => {
    const filePath = `./files/${params.filename}`;
    
    if (!existsSync(filePath)) {
      throw new NotFoundException(`File not found: ${params.filename}`);
    }
    
    return createReadStream(filePath);
  }
});
```

### 3. Content-Type

For custom content types, use the full response object:

```typescript
app.get('/download/file.pdf', {
  handler: () => ({
    status: 200,
    body: createReadStream('./file.pdf'),
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="document.pdf"'
    }
  })
});
```

---

## 🎯 Next Steps

Now that streaming is supported, we can build:
- **File Downloads Helper** - Content-Disposition headers
- **Static File Serving** - Serve entire directories
- **File Uploads** - Receive streams

---

## 📝 Implementation Details

### All Adapters Supported

Streaming works across all SyntroJS adapters:

- ✅ **FastifyAdapter** (default)
- ✅ **FluentAdapter** (tree-shaking)
- ✅ **BunAdapter** (Bun runtime)
- ✅ **UltraFastAdapter** (optimized)
- ✅ **UltraFastifyAdapter** (ultra-optimized)
- ✅ **UltraMinimalAdapter** (minimal)

### Bun Compatibility

Bun automatically converts Node.js Readable streams to Web Streams API, so streaming works seamlessly on both runtimes.

---

**See also:**
- [File Downloads](./FILE_DOWNLOADS.md) (coming in v0.4.1)
- [Static Files](./STATIC_FILES.md) (coming in v0.4.2)
- [File Uploads](./FILE_UPLOADS.md) (coming in v0.4.3)

