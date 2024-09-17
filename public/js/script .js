document.addEventListener("DOMContentLoaded", () => {
    const registerForm = document.querySelector(".loginForm");
    registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const formData = new FormData(registerForm);
      const fullName = formData.get("fullName");
      const username = formData.get("userName");
      const email = formData.get("email");
      const password = formData.get("password");
  
      try {
        const response = await fetch("/register", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ fullName, userName, email, password }),
        });
        if (response.ok) {
          alert("Registration was successful");
        } else {
          alert("Registration failed");
        }
      } catch (error) {
        console.error("Error: ", error);
      }
    });
  });
  