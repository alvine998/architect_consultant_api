const BIGMODEL_BASE_URL = process.env.BIGMODEL_BASE_URL || "https://open.bigmodel.cn/api/paas/v4";
const BIGMODEL_API_KEY = process.env.BIGMODEL_API_KEY;

const requestBigModel = async (path, payload) => {
  if (!BIGMODEL_API_KEY) {
    const error = new Error("BIGMODEL_API_KEY is not configured");
    error.statusCode = 500;
    throw error;
  }

  const response = await fetch(`${BIGMODEL_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${BIGMODEL_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  let data = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch (err) {
      data = { message: text };
    }
  }

  if (!response.ok) {
    const error = new Error(
      data?.error?.message || data?.message || "BigModel request failed"
    );
    error.statusCode = response.status;
    error.details = data;
    throw error;
  }

  return data;
};

const createChatCompletion = (payload) => {
  return requestBigModel("/chat/completions", payload);
};

const generateImage = (payload) => {
  return requestBigModel("/images/generations", payload);
};

module.exports = { createChatCompletion, generateImage };
