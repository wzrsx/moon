async function checkAuthStatus() {
  try {
    const response = await fetch("http://localhost:5050/auth/check", {
      method: "GET",
      credentials: "include" // Важно для передачи кук
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.warn("Ошибка авторизации:", errorData.message);
      return null;
    }

    const data = await response.json();
    console.log("Токен валиден:", data);
    return data.token; // возвращаем токен или true
  } catch (error) {
    console.error("Ошибка запроса авторизации:", error);
    return null;
  }
}
