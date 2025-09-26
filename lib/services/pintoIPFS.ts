export async function uploadFileToPinata(file: any) {
  const url = "https://api.pinata.cloud/pinning/pinFileToIPFS";
  const data = new FormData();
  data.append("file", file);

  const headers = {
    pinata_api_key: process.env.NEXT_PUBLIC_PINATA_API_KEY!,
    pinata_secret_api_key: process.env.NEXT_PUBLIC_PINATA_API_SECRET!,
  };

  const response = await fetch(url, {
    method: "POST",
    headers: headers,
    body: data,
  });

  if (!response.ok) {
    throw new Error(`IPFS pinning error: ${response.statusText}`);
  }

  return response.json();
}

export async function uploadJSONToPinata(jsonData: any) {
  const url = "https://api.pinata.cloud/pinning/pinJSONToIPFS";
  const headers = {
    "Content-Type": "application/json",
    pinata_api_key: process.env.NEXT_PUBLIC_PINATA_API_KEY!,
    pinata_secret_api_key: process.env.NEXT_PUBLIC_PINATA_API_SECRET!,
  };
  const response = await fetch(url, {
    method: "POST",
    headers: headers,
    body: JSON.stringify(jsonData),
  });

  if (!response.ok) {
    throw new Error(`IPFS pinning error: ${response.statusText}`);
  }

  return response.json();
}

export async function viewIPFSData(ipfsHash: any) {
  const url = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch IPFS data: ${response.statusText}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error retrieving data from IPFS:", error);
    throw error;
  }
}
