import { Readable } from 'stream'
import { S3 } from 'aws-sdk'

interface TransformOptions extends DuplexOptions {
  allowHalfOpen?: boolean;
  readableObjectMode?: boolean;
  writableObjectMode?: boolean;

  read?(this: Transform, size: number): void;
  write?(this: Transform, chunk: any, encoding: string, callback: (error?: Error | null) => void): void;
  writev?(this: Transform, chunks: Array<{ chunk: any, encoding: string }>, callback: (error?: Error | null) => void): void;
  final?(this: Transform, callback: (error?: Error | null) => void): void;
  destroy?(this: Transform, error: Error | null, callback: (error: Error | null) => void): void;
  transform?(this: Transform, chunk: any, encoding: string, callback: TransformCallback): void;
  flush?(this: Transform, callback: TransformCallback): void;
}

interface ReadableOptions {
  highWaterMark?: number;
  encoding?: string;
  objectMode?: boolean;
  read?(this: Readable, size: number): void;
  destroy?(this: Readable, error: Error | null, callback: (error: Error | null) => void): void;
  autoDestroy?: boolean;
}

export interface S3Object {
  bucket: string
  key: string
  version?: string
}

export interface S3SearchCriteria {
  bucket: string,
  prefix?: string 
}

export type S3ObjectList = S3Object[]

export class S3ObjectStream extends Readable {

  private buffer: S3ObjectList = []

  constructor(private readonly s3Client: S3) {
    super({
      highWaterMark: 1000,
      objectMode: true,
      autoDestroy: true
    })
  }

  _read(size: number): void {
    if (this.buffer.length === 0) {
      // read the values from s3
      const request = this.s3Client.listObjectVersions({
        Bucket: 'bucket',
        Prefix: 'prefix'
      })

      request.on('success', response => {
        const another = response.nextPage().on('', response => {}).send()
      })
    }

    while(this.buffer.length > 0) {
      this.push(this.buffer.shift())
    }
  }

  _destroy(error: Error | null, callback: (error?: Error | null) => void): void {
    this.buffer = []
    callback(error)
  }
}
