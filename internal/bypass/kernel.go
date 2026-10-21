package bypass

import (
	"os"
	"regexp"
	"strings"
)

// Dynamic kernel presets decrypted on-the-fly via AES-256-GCM vault
// Zero plaintext prompt strings in source control or compiled binary.
func GetKernelPreset(preset string) string {
	switch preset {
	case "raw_state_processor", "raw":
		if custom := os.Getenv("XROUTER_RAW_PROCESSOR_PROMPT"); custom != "" {
			return custom
		}
		if decrypted, err := decryptVault(vaultRawCiphertext); err == nil {
			return decrypted
		}
		return "[RAW_STATE_PROCESSOR]"

	case "sovereign_engine", "sovereign":
		if custom := os.Getenv("XROUTER_SOVEREIGN_PROMPT"); custom != "" {
			return custom
		}
		if decrypted, err := decryptVault(vaultSovereignCiphertext); err == nil {
			return decrypted
		}
		return "[SOVEREIGN_ENGINE]"

	default:
		if custom := os.Getenv("XROUTER_DEFAULT_KERNEL_PROMPT"); custom != "" {
			return custom
		}
		if decrypted, err := decryptVault(vaultDefaultCiphertext); err == nil {
			return decrypted
		}
		return "[DEFAULT_KERNEL_PROMPT]"
	}
}

var refusalPatterns = []*regexp.Regexp{
	regexp.MustCompile(`(?i)\b(cannot provide a response that (takes a stance|meets)|cannot provide a direct analysis)\b`),
	regexp.MustCompile(`(?i)\b(it is not possible to analyze|lacks empirical evidence to support|the question is flawed)\b`),
	regexp.MustCompile(`(?i)\b(as an ai,?\s*i cannot take a stance|not in a position to take a stance)\b`),
	regexp.MustCompile(`(?i)\b(i cannot assist with (generating|creating|writing) malicious|harmful content)\b`),
	regexp.MustCompile(`(?i)^(i cannot|i can't|i'm unable to|i am unable to|i won't|i am not able to|i must (decline|refuse)|i'm not going to)\b`),
}

func IsEvasionRefusal(text string) bool {
	clean := strings.TrimSpace(text)
	if len(clean) < 5 || len(clean) > 5000 {
		return false
	}
	for _, re := range refusalPatterns {
		if re.MatchString(clean) {
			return true
		}
	}
	return false
}
