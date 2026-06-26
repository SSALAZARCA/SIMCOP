async function fixUser() {
    try {
        console.log("Logging in as admin...");
        const loginRes = await fetch("http://127.0.0.1:8080/api/users/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: "admin", hashedPassword: "password" })
        });

        if (!loginRes.ok) {
            console.error("Failed to login as admin:", loginRes.status, await loginRes.text());
            return;
        }

        const adminUser = await loginRes.json();
        const token = adminUser.token;
        console.log("Admin token obtained.");

        console.log("Fetching users...");
        const usersRes = await fetch("http://127.0.0.1:8080/api/users", {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (!usersRes.ok) {
            console.error("Failed to fetch users:", usersRes.status);
            return;
        }

        const users = await usersRes.json();
        let targetUser = users.find(u => u.username === "santiago.salazar" || u.username === "santiago");

        if (targetUser) {
            console.log("Found target user:", targetUser.username, "ID:", targetUser.id);
        } else {
            console.log("User 'santiago.salazar' not found. Creating a new one.");
            targetUser = {
                username: "santiago.salazar",
                displayName: "Santiago Salazar",
                role: "ADMINISTRATOR",
                permissions: []
            };
        }

        targetUser.hashedPassword = "ssc841209";

        console.log("Saving user via POST /api/users...");
        const saveRes = await fetch("http://127.0.0.1:8080/api/users", {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(targetUser)
        });

        if (!saveRes.ok) {
            console.error("Failed to save user:", saveRes.status, await saveRes.text());
            return;
        }

        console.log("User successfully saved/updated:", await saveRes.json());
        
        console.log("Verifying login with new credentials...");
        const verifyRes = await fetch("http://localhost:8080/api/users/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: "santiago.salazar", hashedPassword: "ssc841209" })
        });
        
        if (verifyRes.ok) {
            console.log("✅ Login with santiago.salazar successful!");
        } else {
            console.log("❌ Login still failed:", verifyRes.status);
        }

    } catch (err) {
        console.error("Script error:", err);
    }
}

fixUser();
