import type { Context } from "@oomol/types/oocana";
import fs from "fs";
import path from "path";

//#region generated meta
type Inputs = {
  file: string;
};
type Outputs = {
  remote_url: string;
};
//#endregion

// 分片上传初始化响应类型
type InitUploadResponse = {
  data: {
    upload_id: string;
    part_size: number;
    total_parts: number;
    uploaded_parts: number[];
    presigned_urls: { [part_number: number]: string };
  }
};

// 分片上传函数
async function uploadPart(
  partData: Buffer,
  presignedUrl: string,
  onProgress: () => void,
  retries = 3
): Promise<void> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(presignedUrl, {
        method: "PUT",
        body: new Uint8Array(partData),
        headers: {
          "Content-Type": "application/octet-stream",
        },
      });

      if (!response.ok) {
        throw new Error(`Upload failed with status: ${response.status}`);
      }

      // 上传成功，调用进度回调
      onProgress();
      return;
    } catch (error) {
      if (attempt === retries) {
        throw new Error(
          `Failed to upload part after ${retries} attempts: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
      // 等待一段时间后重试
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    }
  }
}

export default async function (
  params: Inputs,
  context: Context<Inputs, Outputs>
): Promise<Outputs> {
  const filePath = params.file;
  
  if (!filePath || !fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  // 读取文件信息
  const stats = fs.statSync(filePath);
  const fileSize = stats.size;
  const fileExtension = path.extname(filePath);
  
  // Get API key from environment
  const apiKey = context.OOMOL_LLM_ENV.apiKey;
  if (!apiKey) {
    throw new Error("OOMOL_API_KEY environment variable is not set");
  }

  try {
    // Step 1: 初始化分片上传
    const initResponse = await fetch(
      "https://console.oomol.com/api/tasks/files/remote-cache/init",
      {
        method: "POST",
        headers: {
          "Authorization": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          file_extension: fileExtension,
          size: fileSize,
        }),
      }
    );

    if (!initResponse.ok) {
      throw new Error(`Failed to init upload: ${initResponse.status} ${initResponse.statusText}`);
    }

    const initData: InitUploadResponse = await initResponse.json();
    const { upload_id, part_size, total_parts, presigned_urls } = initData.data;

    console.log(`Part Size: ${part_size}`);
    console.log(`Total Parts: ${total_parts}`);
    
    // Step 2: 读取文件并分片上传
    const fileBuffer = fs.readFileSync(filePath);
    const uploadPromises: Promise<void>[] = [];

    let uploadedParts = 0;
    const updateProgress = () => {
      uploadedParts++;
      const progress =Math.floor((uploadedParts / total_parts) * 100);
      if (progress === 100) {
        // 全部上传完成不报 100 , 最后才报
        context.reportProgress(99);
      } else {
        context.reportProgress(progress);
      }
    };

    for (let partNumber = 1; partNumber <= total_parts; partNumber++) {
      const start = (partNumber - 1) * part_size;
      const end = Math.min(start + part_size, fileSize);
      const partData = fileBuffer.subarray(start, end);
      const presignedUrl = presigned_urls[partNumber];

      if (!presignedUrl) {
        throw new Error(`Missing presigned URL for part ${partNumber}`);
      }

      uploadPromises.push(uploadPart(partData, presignedUrl, updateProgress));
    }

    // 并行上传所有分片
    await Promise.all(uploadPromises);

    // Step 3: 获取最终文件URL
    const finalResponse = await fetch(
      `https://console.oomol.com/api/tasks/files/remote-cache/${upload_id}/url`,
      {
        method: "GET",
        headers: {
          "Authorization": apiKey,
        },
      }
    );

    if (!finalResponse.ok) {
      throw new Error(`Failed to get final URL: ${finalResponse.status} ${finalResponse.statusText}`);
    }

    const finalData = await finalResponse.json();
    const cacheUrl = finalData.data?.url;

    if (!cacheUrl) {
      throw new Error("No cache URL received from server");
    }

    context.reportProgress(100);

    return {
      remote_url: cacheUrl,
    };
  } catch (error) {
    throw new Error(`Upload failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}