// src/aiColorHelper.js
export async function generateQRThemeWithAI(promptText) {
  const apiKey = import.meta.env.VITE_AI_PASSPORT_KEY;
  
  if (!apiKey) {
    alert("ยังไม่ได้ตั้งค่า VITE_AI_PASSPORT_KEY ในไฟล์ .env ครับ!");
    return null;
  }

  try {
    const response = await fetch("https://gateway.9arm.co/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "qwen3.8-27b-fp8", 
        messages: [
          {
            role: "system",
            content: "You are a machine that outputs ONLY valid JSON. No conversational text, no markdown formatting. Output EXACTLY this structure: {\"fgColor\":\"#HEXCODE\", \"bgColor\":\"#HEXCODE\"}"
          },
          {
            role: "user",
            content: `Generate color palette for theme: ${promptText}`
          }
        ],
        max_tokens: 300, 
        temperature: 0.1
      })
    });

    const data = await response.json();
    console.log("Raw Response from AI Passport:", data);
    
    if (data.error) {
      alert("AI Passport Error: " + (data.error.message || "เกิดข้อผิดพลาดจากเซิร์ฟเวอร์"));
      return null;
    }

    if (!data.choices || data.choices.length === 0 || !data.choices[0].message) {
      alert("AI Passport ตอบกลับมาแต่ไม่มีข้อความชุดสีครับ ลองกดใหม่อีกครั้ง");
      return null; 
    }

    // ดึงข้อความออกมา (รองรับทั้ง content ปกติ และ reasoning_content)
    let content = data.choices[0].message.content;
    
    if (!content) {
        if (data.choices[0].message.reasoning_content) {
            content = data.choices[0].message.reasoning_content;
        } else {
            alert("ข้อความที่ได้ว่างเปล่าครับ");
            return null;
        }
    }

    console.log("ข้อความดิบที่ AI ตอบกลับมา:", content);

    // ทำความสะอาดข้อความ
    content = content.replace(/```json/g, '').replace(/```/g, '').trim();

    // หาจุดเริ่มต้นและจุดจบของ JSON
    const startIndex = content.indexOf('{');
    const endIndex = content.lastIndexOf('}');

    if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
      const jsonString = content.slice(startIndex, endIndex + 1);
      try {
         return JSON.parse(jsonString);
      } catch (parseError) {
         console.error("แปลง JSON ไม่สำเร็จ:", parseError, jsonString);
         alert("AI จัดรูปแบบชุดสีมาผิดปกติครับ ลองใหม่อีกครั้ง");
         return null;
      }
    } else {
        // ถ้ามันไม่ตอบเป็น JSON ให้แสดงข้อความที่มันตอบออกมาให้เราดูเลย
        const previewText = content.substring(0, 40) + "...";
        alert(`AI ดื้อไม่ยอมส่ง JSON ครับ มันส่งมาว่า: "${previewText}"`);
        return null;
    }

  } catch (error) {
    console.error("AI Error Details:", error);
    alert("เกิดปัญหาขัดข้อง กรุณาลองใหม่อีกครั้ง");
    return null;
  }
}