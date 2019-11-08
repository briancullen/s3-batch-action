import Stream from 'stream'

export interface TypedStream 

export interface StreamingRequest {
    send(): Stream.Readable
}