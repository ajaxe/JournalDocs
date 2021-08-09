const path = require("path");
const crypto = require("crypto");
const util = require("util");
const { promises: fs } = require("fs");
const AWS = require("aws-sdk");
const mime = require("mime-types");

const DocsBucketName = "apogee-dev.com";

const s3Client = new AWS.S3();

const getFiles = async function (path) {
  const entries = await fs.readdir(path, { withFileTypes: true });

  const files = entries
    .filter((file) => !file.isDirectory())
    .map((file) => ({ ...file, path: path + file.name }));

  const folders = entries.filter((folder) => folder.isDirectory());
  for (const folder of folders) {
    files.push(...(await getFiles(`${path}${folder.name}/`)));
  }

  return files;
};

const copyFiles = async function (rootPath) {
  const files = await getFiles(rootPath);
  const copyPromises = [];
  for (const file of files) {
    const s3Key = getS3KeyFromFilePath(rootPath, file.path);

    console.log(`filepath: ${file.path}, s3Key: ${s3Key}`);

    const p = uploadFileIfChanged(file.path, s3Key);
    copyPromises.push(p);
  }
};

/**
 *
 * @param {string} filepath
 * @param {string} s3Key
 */
const uploadFileIfChanged = async function (filepath, s3Key) {
  const fileContent = await fs.readFile(filepath);

  if (isS3ObjectChanged(s3Key, fileContent)) {
    let response = await s3Client
      .putObject({
        Bucket: DocsBucketName,
        Key: s3Key,
        Body: fileContent,
        ContentType: mime.lookup(filepath),
      })
      .promise();

    if (response.$response.httpResponse.statusCode !== 200) {
      console.log(response.$response.httpResponse.statusCode);
    }
  }
};

/**
 *
 * @param {string} rootPath
 * @param {string} filePath
 */
const getS3KeyFromFilePath = function (rootPath, filePath) {
  if (filePath.indexOf(rootPath) !== 0) {
    throw new Error("Invalid file path, expect to begin with: " + rootPath);
  }
  return filePath.substring(rootPath.length);
};

/**
 * Compute etag for fileContent and check if the S3 object given by fileKey has changed.
 * @param {string} fileKey
 * @param {buffer} fileContent
 */
const isS3ObjectChanged = async function (fileKey, fileContent) {
  let etag = generateMD5Hash(fileContent);
  let success = false;
  try {
    let obj = await s3Client
      .getObject({
        Bucket: DocsBucketName,
        IfNoneMatch: etag,
        Key: fileKey,
      })
      .promise();

    if (obj.$response.data != null) {
      console.log(
        `S3 fileKey: ${fileKey}, etag: ${obj.$response.data.ETag}, computed: ${etag}`
      );
      success = true;
    }
    success = false;
  } catch (err) {
    if (err.stack.startsWith("NotModified")) {
      success = false;
    } else {
      throw err;
    }
  }
  return success;
};

const generateMD5Hash = function (fileData) {
  let hasher = crypto.createHash("md5");
  return hasher.update(fileData).digest("hex");
};

try {
  (async function () {
    await copyFiles(path.join(__dirname, "../site/"));
  })();
} catch (err) {
  console.error(err);
}
