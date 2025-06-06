package handlers_auth

import (
	"context"
	"crypto/rand"
	"encoding/json"
	"fmt"
	"io"
	"log"
	jwt_logic "loonar_mod/backend/JWT_logic"
	"loonar_mod/backend/authorization/config_auth"
	"loonar_mod/backend/repository/queries_auth"
	"net/http"
	"net/smtp"
	"sync"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"go.uber.org/zap"
)

type AuthHandlers struct {
	ConfigAuth *config_auth.ConfigAuth
	Logger     *zap.Logger
	Pool       *pgxpool.Pool
}

type EmailCodeRecord struct {
	Username   string
	Password   string
	Code       string
	ExpiresAt  time.Time
	BlockUntil time.Time
	Attempts   int
}

var mu sync.RWMutex // Для потокобезопасности
var registrationCodes = make(map[string]*EmailCodeRecord)

var recoverCodes = make(map[string]*EmailCodeRecord)

func CreateAuthHandlers(cfg_auth *config_auth.ConfigAuth, logger *zap.Logger, pool *pgxpool.Pool) *AuthHandlers {
	return &AuthHandlers{
		ConfigAuth: cfg_auth,
		Logger:     logger,
		Pool:       pool,
	}
}

func (a *AuthHandlers) RegisterHandler(rw http.ResponseWriter, r *http.Request) {
	type CredentialsRegistration struct {
		Username string `json:"username"`
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	var creds CredentialsRegistration
	err := json.NewDecoder(r.Body).Decode(&creds)
	if err != nil {
		a.Logger.Sugar().Errorf("Error Decoding credentials: %v", err)
		respondWithJSON(rw, http.StatusBadRequest, map[string]string{
			"error": fmt.Sprintf("Error Decoding credentials: %v", err),
		})
		return
	}
	if len(creds.Password) < 5 {
		respondWithJSON(rw, http.StatusBadRequest, map[string]string{
			"message": "Password is too small.",
		})
		return
	}

	// Проверяем есть ли email в БД
	if err = queries_auth.ExistsEmail(creds.Email, a.Pool); err != nil {
		if err.Error() == "email exists" {
			respondWithJSON(rw, http.StatusBadRequest, map[string]string{
				"message": "email exists",
			})
			return
		}
		a.Logger.Sugar().Errorf("Error check email exists DB: %v", err)
		return
	}

	a.sendWelcomeEmail(creds.Email, creds.Username, creds.Password, true, rw)
}
func (a *AuthHandlers) RecoverHandler(rw http.ResponseWriter, r *http.Request) {
	type CredentialsRegistration struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	var creds CredentialsRegistration
	err := json.NewDecoder(r.Body).Decode(&creds)
	if err != nil {
		a.Logger.Sugar().Errorf("Error Decoding credentials: %v", err)
		respondWithJSON(rw, http.StatusBadRequest, map[string]string{
			"error": fmt.Sprintf("Error Decoding credentials: %v", err),
		})
		return
	}

	if err = queries_auth.ExistsEmail(creds.Email, a.Pool); err != nil {
		if err.Error() != "email exists" {
			respondWithJSON(rw, http.StatusBadRequest, map[string]string{
				"message": "Error check email exists DB",
			})
			a.Logger.Sugar().Errorf("Error check email exists DB: %v", err)
			return
		}
		a.sendWelcomeEmail(creds.Email, "", creds.Password, false, rw)
		return
	}
	respondWithJSON(rw, http.StatusNotFound, map[string]string{
		"message": "email not exists",
	})

}

func (a *AuthHandlers) sendWelcomeEmail(email, username, password string, isReg bool, rw http.ResponseWriter) {

	auth := smtp.PlainAuth("", a.ConfigAuth.Sender, a.ConfigAuth.SenderPassword, a.ConfigAuth.SMTP_Host)

	confirmationCode := genConfirmCode()

	// Формируем красивое HTML-письмо

	subject := "Ваш код подтверждения"
	var body string
	if isReg {
		body = fmt.Sprintf(`
				<html>
				<body style="font-family: Arial, sans-serif; line-height: 1.6;">
					<div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
						<h2 style="color: #444;">Регистрация</h2>
						<p>Для регистрации введите следующий код подтверждения:</p>
						
						<div style="background: #f5f5f5; padding: 15px; text-align: center; 
									margin: 20px 0; font-size: 24px; letter-spacing: 2px;
									border-radius: 5px; font-weight: bold;">
							%s
						</div>
						
						<p>Этот код действителен в течение 5 минут.</p>
						<p style="color: #888; font-size: 12px;">
							Если вы не запрашивали этот код, пожалуйста, проигнорируйте это письмо.
						</p>
					</div>
				</body>
				</html>
				`, confirmationCode)
		// Формируем заголовки письма
		headers := make(map[string]string)
		headers["From"] = a.ConfigAuth.Sender
		headers["To"] = email
		headers["Subject"] = subject
		headers["MIME-Version"] = "1.0"
		headers["Content-Type"] = "text/html; charset=\"utf-8\""

		// Собираем все части письма
		message := ""
		for k, v := range headers {
			message += fmt.Sprintf("%s: %s\r\n", k, v)
		}
		message += "\r\n" + body

		// Отправка письма
		err := smtp.SendMail(
			a.ConfigAuth.SMTP_Host+":"+a.ConfigAuth.SMTP_Port,
			auth,
			a.ConfigAuth.Sender,
			[]string{email},
			[]byte(message),
		)
		if err != nil {
			a.Logger.Sugar().Errorf("Error sending email: %v", err)
			respondWithJSON(rw, http.StatusBadRequest, map[string]string{
				"error": fmt.Sprintf("Error sending email: %v", err),
			})
			return
		}

		// Устанавливаем код в слайс
		setCode(confirmationCode, email, username, password)
		respondWithJSON(rw, http.StatusOK, map[string]string{
			"message": "Registration successful. Please check your email",
			"next":    "codeDialog",
			"code":    confirmationCode, // Отправляем код и в ответе (для удобства тестирования)
		})
	} else {
		body = fmt.Sprintf(`
				<html>
				<body style="font-family: Arial, sans-serif; line-height: 1.6;">
					<div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
						<h2 style="color: #444;">Восстановление пароля</h2>
						<p>Для восстановления пароля введите следующий код подтверждения:</p>
						
						<div style="background: #f5f5f5; padding: 15px; text-align: center; 
									margin: 20px 0; font-size: 24px; letter-spacing: 2px;
									border-radius: 5px; font-weight: bold;">
							%s
						</div>
						
						<p>Этот код действителен в течение 5 минут.</p>
						<p style="color: #888; font-size: 12px;">
							Если вы не запрашивали этот код, пожалуйста, проигнорируйте это письмо.
						</p>
					</div>
				</body>
				</html>
				`, confirmationCode)
		// Формируем заголовки письма
		headers := make(map[string]string)
		headers["From"] = a.ConfigAuth.Sender
		headers["To"] = email
		headers["Subject"] = subject
		headers["MIME-Version"] = "1.0"
		headers["Content-Type"] = "text/html; charset=\"utf-8\""

		// Собираем все части письма
		message := ""
		for k, v := range headers {
			message += fmt.Sprintf("%s: %s\r\n", k, v)
		}
		message += "\r\n" + body

		// Отправка письма
		err := smtp.SendMail(
			a.ConfigAuth.SMTP_Host+":"+a.ConfigAuth.SMTP_Port,
			auth,
			a.ConfigAuth.Sender,
			[]string{email},
			[]byte(message),
		)
		if err != nil {
			a.Logger.Sugar().Errorf("Error sending email: %v", err)
			respondWithJSON(rw, http.StatusBadRequest, map[string]string{
				"error": fmt.Sprintf("Error sending email: %v", err),
			})
			return
		}

		// Устанавливаем код в слайс
		setRecoverCode(confirmationCode, email, password)
		respondWithJSON(rw, http.StatusOK, map[string]string{
			"message": "Recover successful. Please check your email",
			"next":    "codeDialog",
			// "code":    confirmationCode, // Отправляем код и в ответе (для удобства тестирования)
		})
	}

}

func (a *AuthHandlers) CheckCodeRegistrationHandler(rw http.ResponseWriter, r *http.Request) {
	type CredentialsCode struct {
		Email string `json:"email"`
		Code  string `json:"code"`
	}
	var creds CredentialsCode

	err := json.NewDecoder(r.Body).Decode(&creds)
	if err != nil {
		a.Logger.Sugar().Errorf("Error Decoding credentials: %v", err)
		respondWithJSON(rw, http.StatusBadRequest, map[string]string{
			"error": fmt.Sprintf("Error Decoding credentials: %v", err),
		})
		return
	}

	// Блокировка для потокобезопасности
	mu.Lock()
	defer mu.Unlock()

	code_info := registrationCodes[creds.Email]

	if code_info == nil {
		respondWithJSON(rw, http.StatusBadRequest, map[string]string{
			"message": "Code to email is not exists.",
		})
		return
	}
	if code_info.Attempts >= 10 {
		code_info.BlockUntil = time.Now().Add(time.Minute * 1)
		respondWithJSON(rw, http.StatusBadRequest, map[string]string{
			"message":   "Too many attempts. You have blocked on 1 minute",
			"unlock_at": code_info.BlockUntil.Format(time.RFC3339),
		})
		code_info.Attempts = 0
		return
	}

	if time.Now().After(code_info.ExpiresAt) {
		respondWithJSON(rw, http.StatusBadRequest, map[string]string{
			"message": "Code time has expired",
		})
		return
	}

	if code_info.BlockUntil.After(time.Now()) {
		respondWithJSON(rw, http.StatusBadRequest, map[string]string{
			"message":   "You have blocked on 1 minute",
			"unlock_at": code_info.BlockUntil.Format(time.RFC3339),
		})
		return
	}

	if code_info.Code != creds.Code {
		code_info.Attempts++
		respondWithJSON(rw, http.StatusBadRequest, map[string]string{
			"message": "Code is not match",
		})
		return
	}

	// добавляем пользователя в БД
	err, user_id := queries_auth.RegistrationQuery(code_info.Username, creds.Email, code_info.Password, a.Pool)
	if err != nil {
		a.Logger.Sugar().Errorf("Error create new user in DB: %v", err)
		respondWithJSON(rw, http.StatusInternalServerError, map[string]string{
			"message": fmt.Sprint("Error create new user"),
		})
		delete(registrationCodes, creds.Email)
		return
	}

	ctx := context.Background()
	string_tocken, err := jwt_logic.CreateTocken(&ctx, code_info.Username, user_id, "", a.Logger)
	if err != nil {
		respondWithJSON(rw, http.StatusInternalServerError, map[string]string{
			"error": fmt.Sprintf("Error create JWT-tocken: %v", err),
		})
		return
	}
	rw.Header().Add("Authorization", string_tocken)
	setCookie(rw, string_tocken)

	// Удаляем код из слайса
	delete(registrationCodes, creds.Email)

	respondWithJSON(rw, http.StatusOK, map[string]string{
		"message": "Success recover",
	})
}

func (a *AuthHandlers) CheckCodeRecoverHandler(rw http.ResponseWriter, r *http.Request) {
	type CredentialsCode struct {
		Email string `json:"email"`
		Code  string `json:"code"`
	}
	var creds CredentialsCode

	err := json.NewDecoder(r.Body).Decode(&creds)
	if err != nil {
		a.Logger.Sugar().Errorf("Error Decoding credentials: %v", err)
		respondWithJSON(rw, http.StatusBadRequest, map[string]string{
			"error": fmt.Sprintf("Error Decoding credentials: %v", err),
		})
		return
	}

	// Блокировка для потокобезопасности
	mu.Lock()
	defer mu.Unlock()

	code_info := recoverCodes[creds.Email]

	if code_info == nil {
		respondWithJSON(rw, http.StatusBadRequest, map[string]string{
			"message": "Code to email is not exists.",
		})
		return
	}
	if code_info.Attempts >= 10 {
		code_info.BlockUntil = time.Now().Add(time.Minute * 1)
		respondWithJSON(rw, http.StatusBadRequest, map[string]string{
			"message":   "Too many attempts. You have blocked on 1 minute",
			"unlock_at": code_info.BlockUntil.Format(time.RFC3339),
		})
		code_info.Attempts = 0
		return
	}

	if time.Now().After(code_info.ExpiresAt) {
		respondWithJSON(rw, http.StatusBadRequest, map[string]string{
			"message": "Code time has expired",
		})
		return
	}

	if code_info.BlockUntil.After(time.Now()) {
		respondWithJSON(rw, http.StatusBadRequest, map[string]string{
			"message":   "You have blocked on 1 minute",
			"unlock_at": code_info.BlockUntil.Format(time.RFC3339),
		})
		return
	}

	if code_info.Code != creds.Code {
		log.Println(creds.Code)
		log.Println(code_info.Code)
		code_info.Attempts++
		respondWithJSON(rw, http.StatusBadRequest, map[string]string{
			"message": "Code is not match",
		})
		return
	}

	err = queries_auth.RecoveryQuery(creds.Email, code_info.Password, a.Pool)
	if err != nil {
		if err.Error() == "user with this email does not exist" {
			respondWithJSON(rw, http.StatusInternalServerError, map[string]string{
				"message": err.Error(),
			})
		}
		a.Logger.Sugar().Errorf("Error update user in DB: %v", err)
		respondWithJSON(rw, http.StatusInternalServerError, map[string]string{
			"message": "Error update user",
		})
		delete(recoverCodes, creds.Email)
		return
	}

	respondWithJSON(rw, http.StatusOK, map[string]string{
		"message": "Success recover",
	})
}

func (a *AuthHandlers) ChengePassHandler(rw http.ResponseWriter, r *http.Request) {

}

func (a *AuthHandlers) SignInHandler(rw http.ResponseWriter, r *http.Request) {
	type CredentialsAuth struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	var creds CredentialsAuth
	err := json.NewDecoder(r.Body).Decode(&creds)
	if err != nil {
		a.Logger.Sugar().Errorf("Error Decoding credentials: %v", err)
		respondWithJSON(rw, http.StatusBadRequest, map[string]string{
			"error": fmt.Sprintf("Error Decoding credentials: %v", err),
		})
		return
	}

	check_auth_err, data := queries_auth.AuthorizeQuery(creds.Email, creds.Password, a.Pool)
	if check_auth_err != nil {
		if check_auth_err.Error() == "email not found" {
			respondWithJSON(rw, http.StatusNotFound, map[string]string{
				"message": fmt.Sprint("Email not found."),
			})
			return
		}
		if check_auth_err.Error() == "pass invalid" {
			respondWithJSON(rw, http.StatusConflict, map[string]string{
				"message": fmt.Sprint("Invalid password."),
			})
			return
		}
		a.Logger.Sugar().Errorf("Error query to authorize: %v", err)
		respondWithJSON(rw, http.StatusInternalServerError, map[string]string{
			"error": fmt.Sprintf("Error query to authorize: %v", err),
		})
		return
	}

	ctx := context.Background()
	string_tocken, err := jwt_logic.CreateTocken(&ctx, data.Username, data.UserID, "", a.Logger)
	if err != nil {
		respondWithJSON(rw, http.StatusInternalServerError, map[string]string{
			"error": fmt.Sprintf("Error create JWT-tocken: %v", err),
		})
		return
	}
	rw.Header().Add("Authorization", string_tocken)
	setCookie(rw, string_tocken)

	respondWithJSON(rw, http.StatusOK, map[string]string{
		"message": "Success authorize",
	})
}

func genConfirmCode() string {
	var table = [...]byte{'1', '2', '3', '4', '5', '6', '7', '8', '9', '0'}
	b := make([]byte, 4)
	n, err := io.ReadAtLeast(rand.Reader, b, 4)
	if n != 4 {
		panic(err)
	}
	for i := 0; i < len(b); i++ {
		b[i] = table[int(b[i])%len(table)]
	}
	return string(b)
}

func (a *AuthHandlers) LogoutHandler(w http.ResponseWriter, r *http.Request) {
	// Удаляем JWT куку
	http.SetCookie(w, &http.Cookie{
		Name:    "jwt_token",
		Value:   "",
		Path:    "/",
		Expires: time.Unix(0, 0),
		MaxAge:  -1,
	})

	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"status": "success"}`))
}

// Вспомогательная функция для JSON-ответов
func respondWithJSON(w http.ResponseWriter, code int, payload interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(payload)
}

func setCode(confirmation_code string, email string, username string, password string) {
	mu.Lock()
	defer mu.Unlock()

	record := &EmailCodeRecord{
		Code:       confirmation_code,
		ExpiresAt:  time.Now().Add(5 * time.Minute),
		BlockUntil: time.Now(),
		Attempts:   0,
		Username:   username,
		Password:   password,
	}

	registrationCodes[email] = record

	time.AfterFunc(15*time.Minute, func() {
		mu.Lock()
		defer mu.Unlock()

		// Удаляем только если это та же самая запись
		if stored, exists := registrationCodes[email]; exists && stored == record {
			delete(registrationCodes, email)
		}
	})
}
func setRecoverCode(confirmation_code string, email, password string) {
	mu.Lock()
	defer mu.Unlock()

	record := &EmailCodeRecord{
		Password:   password,
		Code:       confirmation_code,
		ExpiresAt:  time.Now().Add(5 * time.Minute),
		BlockUntil: time.Now(),
		Attempts:   0,
	}

	recoverCodes[email] = record

	time.AfterFunc(15*time.Minute, func() {
		mu.Lock()
		defer mu.Unlock()

		// Удаляем только если это та же самая запись
		if stored, exists := recoverCodes[email]; exists && stored == record {
			delete(recoverCodes, email)
		}
	})
}
func (a *AuthHandlers) CheckAuthHandler(w http.ResponseWriter, r *http.Request) {
	// 1. Получаем куку jwt_token
	cookie, err := r.Cookie("jwt_token")
	if err != nil {
		http.Error(w, `{"message": "Токен отсутствует"}`, http.StatusUnauthorized)
		return
	}

	tokenStr := cookie.Value

	log.Println(tokenStr)
	// 2. Парсим и проверяем токен
	token, err := jwt_logic.VerifyToken(tokenStr)

	if err != nil || !token.Valid {
		http.Error(w, `{"message": "Неверный токен"}`, http.StatusUnauthorized)
		return
	}

	// 3. Токен валиден — возвращаем успех
	w.Header().Set("Content-Type", "application/json")
	respondWithJSON(w, http.StatusAccepted, map[string]interface{}{
		"authenticated": true,
		"token":         tokenStr,
		"claims":        token.Claims,
	})
}
func setCookie(rw http.ResponseWriter, string_tocken string) {
	http.SetCookie(rw, &http.Cookie{
		Name:     "jwt_token",
		Value:    string_tocken,
		Path:     "/",
		HttpOnly: true,
		Secure:   true, // Для HTTPS
		SameSite: http.SameSiteStrictMode,
		Expires:  time.Now().Add(24 * time.Hour), // Срок действия
	})
}
