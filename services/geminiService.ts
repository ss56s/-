import { GoogleGenAI } from "@google/genai";
import { SimulationConfig, SimulationState, ChatMessage } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getExplanation = async (
  message: string,
  config: SimulationConfig,
  state: SimulationState,
  history: ChatMessage[]
): Promise<string> => {
  try {
    const systemInstruction = `
      你是一位专业且亲切的高中物理老师，专门负责讲解"运动的合成与分解"。
      你的目标是帮助学生通过当前的模拟实验理解物理概念。
      
      当前模拟器的状态如下：
      - 初速度(v0): x=${config.v0.x.toFixed(2)} m/s, y=${config.v0.y.toFixed(2)} m/s
      - 加速度(a): x=${config.a.x.toFixed(2)} m/s², y=${config.a.y.toFixed(2)} m/s²
      - 当前时间(t): ${state.t.toFixed(2)} s
      - 当前位置: x=${state.position.x.toFixed(2)} m, y=${state.position.y.toFixed(2)} m
      - 当前合速度: ${Math.sqrt(state.velocity.x ** 2 + state.velocity.y ** 2).toFixed(2)} m/s
      
      请用简洁明了的中文回答学生的问题。
      如果学生问到"为什么轨迹是弯曲的"、"合速度怎么变"等问题，请结合上述数据进行解释。
      强调分运动的独立性和等时性。
      如果是平抛运动（ax=0, ay!=0, v0x!=0），请特别提到水平方向是匀速直线，竖直方向是匀加速。
    `;

    // Filter out invalid history starts (Gemini requires user turn first)
    const validHistory = history.filter((msg, index) => {
      if (index === 0 && msg.role === 'model') return false;
      return true;
    });

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        ...validHistory.map(msg => ({ role: msg.role, parts: [{ text: msg.text }] })), 
        { role: "user", parts: [{ text: message }] }
      ],
      config: {
        systemInstruction: systemInstruction,
      },
    });

    return response.text || "抱歉，我暂时无法回答这个问题。";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "连接AI老师时出现错误，请检查网络或API Key。";
  }
};
