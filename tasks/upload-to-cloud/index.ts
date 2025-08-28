import type { Context } from "@oomol/types/oocana";
import fs from "fs";
import path from "path";

//#region generated meta
type Inputs = {
  file: string;
};
type Outputs = {
  cache_url: string;
};
//#endregion

export default async function (
  params: Inputs,
  context: Context<Inputs, Outputs>
): Promise<Outputs> {
  const filePath = params.file;
  
  if (!filePath || !fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  // Read file content
  const fileBuffer = fs.readFileSync(filePath);
  
  // Get API key from environment
  const apiKey = context.OOMOL_LLM_ENV.apiKey;
  if (!apiKey) {
    throw new Error("OOMOL_API_KEY environment variable is not set");
  }

  try {
    // Step 2: Upload file to the presigned URL
    const form = new FormData();
    form.append("file", new Blob([fileBuffer]), path.basename(filePath));

    const uploadResponse = await fetch("https://console.oomol.com/api/tasks/files/remote-cache", {
      method: "POST",
      headers: {
        "Authorization": apiKey,
      },
      body: form,
    });

    if (!uploadResponse.ok) {
      throw new Error(`Failed to upload file: ${uploadResponse.status} ${uploadResponse.statusText}`);
    }

    const resp = await uploadResponse.json();
    const presignedUrl = resp.data?.presigned_url;
    
    if (!presignedUrl) {
      throw new Error("No presigned URL received from server");
    }

    return {
      cache_url: presignedUrl,
    };
  } catch (error) {
    throw new Error(`Upload failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}
