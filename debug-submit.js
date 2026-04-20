// Debug script to test submit logic
// This simulates what happens when user clicks submit

async function testSubmitFlow() {
  console.log("=== Testing Submit Flow ===");
  
  try {
    // Step 1: Test session API
    console.log("1. Testing session API...");
    const sessionResponse = await fetch("http://localhost:3000/api/auth/session");
    const sessionData = await sessionResponse.json();
    console.log("Session response:", sessionData);
    
    if (!sessionData.user?.email) {
      console.log("ERROR: No authenticated user found");
      return;
    }
    
    // Step 2: Test metadata store API
    console.log("2. Testing metadata store API...");
    const testData = {
      user_email: sessionData.user.email,
      business_name: "Test Business",
      website_url: "https://test.com",
      external_links: "https://docs.test.com"
    };
    
    const storeResponse = await fetch("http://localhost:3000/api/metadata/store", {
      method: "POST",
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData),
    });
    
    console.log("Store response status:", storeResponse.status);
    const storeResult = await storeResponse.json();
    console.log("Store response data:", storeResult);
    
    console.log("=== Submit Flow Test Complete ===");
    
  } catch (error) {
    console.error("Test failed:", error);
  }
}

// Uncomment to run: testSubmitFlow();
console.log("Debug script created. Run testSubmitFlow() in browser console to test.");
