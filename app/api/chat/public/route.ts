// export async function POST(req: Request) {

//     //first check valid token and payload
//     // 1. Extracting the payload
//     let { messages, knowledge_source_ids } = await req.json();
  
//     // 2. Identifying the most recent message
//     const lastMessage = messages[messages.length - 1];
  
//     // 3. Authorization/Validation Check
//     // This verifies that a message exists and the role is specifically "user"
//     if (!lastMessage || lastMessage.role !== "user") {
//       // Edge case: Client might send empty or weird state, handle gracefully
//       console.log("No new user message detected or invalid format");
      
//       // In a production scenario, you return a 400 response to stop execution
//       return new Response("Invalid request", { status: 400 });
//     }
  
//     // ... (The video continues with context retrieval and OpenAI streaming below this)
//   }