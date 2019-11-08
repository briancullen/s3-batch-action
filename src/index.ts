import AWS, { AWSError } from 'aws-sdk'
import proxy from 'proxy-agent'
import moment from 'moment'
import { ListObjectVersionsOutput } from 'aws-sdk/clients/s3'

process.env.AWS_SDK_LOAD_CONFIG = 'true'
process.env.AWS_PROFILE = 'prod'

interface ObjectVersion {
  Key: string
  VersionId: string
  Body: Buffer
}

if (process.env.http_proxy) {
  console.log(`Reading HTTP_PROXY from environment as ${process.env.http_proxy}`)
  AWS.config.update({
    httpOptions: { agent: proxy(process.env.http_proxy) as any }
  })
}

const cutoff = moment('2018-07-01 00:00:00.000')
const bucket = 'bucket-name'
const prefix = 'input/'
// const outputFolder = 'downloaded-files'

const s3Client = new AWS.S3()
getVersions(bucket, prefix)
  .then(async versions => {
    console.log('File,Version,Date,DayOfWeek,Time,Count')
    const countPromises = versions
      .filter(version => moment(version.LastModified).isAfter(cutoff))
      .map(async version => processVersion(version)
        .catch(err => {
          const modifiedDate = moment(version.LastModified)
          console.log(`${version.Key},${version.VersionId},${modifiedDate.format('YYYY-MM-DD')},
            ${modifiedDate.format('dddd')},${modifiedDate.format('HH:mm:ss')},${err.message || err}`)
          return 0
        }))

    return Promise.all(countPromises)
      .then(counts => counts.reduce((total, num) => total + num))
  })
  .then(value => console.log(`\n\nTotal:,${value}`))
  .catch(error => console.error(JSON.stringify(error, null, 2)))

async function getVersions (bucket: string, prefix: string): Promise<AWS.S3.Types.ObjectVersion[]> {
  return new Promise((resolve, reject) => {
    let result: AWS.S3.Types.ObjectVersion[] = []

    const response = s3Client.listObjectVersions({})
    response.promise()
    response.send((err : AWSError, data: ListObjectVersionsOutput) => {
      
    })
    

    s3Client.listObjectVersions({
      Bucket: bucket,
      Prefix: prefix
    }).eachPage((err, data) => {
      if (err) {
        console.error('Unable to get object versions: ', err)
        reject(err)
      }

      if (!data) {
        resolve(result)
        return false
      } else {
        result = result.concat(data.Versions ?? [])
        return true
      }
    })
  })
}

async function processVersion (object: AWS.S3.Types.ObjectVersion): Promise<number> {
  return s3Client.getObject({
    Bucket: bucket,
    Key: object.Key ?? '',
    VersionId: object.VersionId
  }).promise()
    .then(response => {
      // return outputFile(`${outputFolder}/${object.Key}-${object.VersionId}`, response.Body)

      // Take away one row for the CSV header
      const count = (response.Body ?? '').toString().trim().split(/\r?\n/g).length - 1
      const modifiedDate = moment(object.LastModified)
      console.log(`${object.Key},${object.VersionId},${modifiedDate.format('YYYY-MM-DD')},
        ${modifiedDate.format('dddd')},${modifiedDate.format('HH:mm:ss')},${count}`)
      return count
    })
}
