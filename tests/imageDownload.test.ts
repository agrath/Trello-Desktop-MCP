import {
  IMAGE_MIME_TYPES,
  MAX_IMAGE_BYTES,
  isAllowedAttachmentUrl,
  imageDownloadEnabled
} from '../src/utils/imageDownload.js';

describe('IMAGE_MIME_TYPES', () => {
  it('should include common image types', () => {
    expect(IMAGE_MIME_TYPES.has('image/png')).toBe(true);
    expect(IMAGE_MIME_TYPES.has('image/jpeg')).toBe(true);
    expect(IMAGE_MIME_TYPES.has('image/gif')).toBe(true);
    expect(IMAGE_MIME_TYPES.has('image/webp')).toBe(true);
  });

  it('should not include non-image types', () => {
    expect(IMAGE_MIME_TYPES.has('application/pdf')).toBe(false);
    expect(IMAGE_MIME_TYPES.has('text/html')).toBe(false);
    expect(IMAGE_MIME_TYPES.has('application/octet-stream')).toBe(false);
  });
});

describe('MAX_IMAGE_BYTES', () => {
  it('should be 5 MB', () => {
    expect(MAX_IMAGE_BYTES).toBe(5 * 1024 * 1024);
  });
});

describe('isAllowedAttachmentUrl', () => {
  it('should allow https://trello.com paths', () => {
    expect(isAllowedAttachmentUrl('https://trello.com/1/cards/abc/attachments/xyz/download/file.png')).toBe(true);
  });

  it('should allow trello.com subdomains', () => {
    expect(isAllowedAttachmentUrl('https://api.trello.com/1/cards/abc')).toBe(true);
  });

  it('should allow the trello-attachments S3 bucket', () => {
    expect(isAllowedAttachmentUrl('https://trello-attachments.s3.amazonaws.com/abc/file.png')).toBe(true);
  });

  it('should reject other S3 buckets', () => {
    expect(isAllowedAttachmentUrl('https://malicious-attachments.s3.amazonaws.com/file.png')).toBe(false);
  });

  it('should reject internal/loopback hosts', () => {
    expect(isAllowedAttachmentUrl('http://localhost/admin')).toBe(false);
    expect(isAllowedAttachmentUrl('http://127.0.0.1:8080/secret')).toBe(false);
    expect(isAllowedAttachmentUrl('http://169.254.169.254/latest/meta-data/')).toBe(false);
  });

  it('should reject http:// even on trello.com', () => {
    expect(isAllowedAttachmentUrl('http://trello.com/some/path')).toBe(false);
  });

  it('should reject hostnames that merely contain "trello.com"', () => {
    expect(isAllowedAttachmentUrl('https://trello.com.attacker.example/file.png')).toBe(false);
    expect(isAllowedAttachmentUrl('https://nottrello.com/file.png')).toBe(false);
  });

  it('should reject malformed URLs', () => {
    expect(isAllowedAttachmentUrl('not a url')).toBe(false);
    expect(isAllowedAttachmentUrl('')).toBe(false);
  });

  it('should reject non-http(s) schemes', () => {
    expect(isAllowedAttachmentUrl('file:///etc/passwd')).toBe(false);
    expect(isAllowedAttachmentUrl('ftp://trello.com/file')).toBe(false);
  });
});

describe('imageDownloadEnabled', () => {
  const originalValue = process.env.TRELLO_DOWNLOAD_IMAGES;

  afterEach(() => {
    if (originalValue === undefined) {
      delete process.env.TRELLO_DOWNLOAD_IMAGES;
    } else {
      process.env.TRELLO_DOWNLOAD_IMAGES = originalValue;
    }
  });

  it('should default to true when env var is unset', () => {
    delete process.env.TRELLO_DOWNLOAD_IMAGES;
    expect(imageDownloadEnabled()).toBe(true);
  });

  it('should be true for truthy strings', () => {
    process.env.TRELLO_DOWNLOAD_IMAGES = 'true';
    expect(imageDownloadEnabled()).toBe(true);
    process.env.TRELLO_DOWNLOAD_IMAGES = '1';
    expect(imageDownloadEnabled()).toBe(true);
    process.env.TRELLO_DOWNLOAD_IMAGES = '';
    expect(imageDownloadEnabled()).toBe(true); // empty string is treated as "set to default"
  });

  it('should be false for the documented opt-out values', () => {
    for (const v of ['false', 'FALSE', 'False', '0', 'no', 'off']) {
      process.env.TRELLO_DOWNLOAD_IMAGES = v;
      expect(imageDownloadEnabled()).toBe(false);
    }
  });

  it('should ignore surrounding whitespace', () => {
    process.env.TRELLO_DOWNLOAD_IMAGES = '  false  ';
    expect(imageDownloadEnabled()).toBe(false);
  });
});
