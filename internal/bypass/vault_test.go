package bypass

import (
	"strings"
	"testing"
)

func TestGetKernelPreset(t *testing.T) {
	def := GetKernelPreset("default")
	if !strings.Contains(def, "TECHNICAL SPECIFICATION & EXECUTION ENGINE") {
		t.Fatalf("expected default kernel to decrypt properly, got: %s", def)
	}

	raw := GetKernelPreset("raw_state_processor")
	if !strings.Contains(raw, "MODE: RAW_STATE_PROCESSOR") {
		t.Fatalf("expected raw state processor to decrypt properly, got: %s", raw)
	}

	sov := GetKernelPreset("sovereign_engine")
	if !strings.Contains(sov, "SOVEREIGN EXECUTION KERNEL") {
		t.Fatalf("expected sovereign engine to decrypt properly, got: %s", sov)
	}
}

func BenchmarkDecryptVault(b *testing.B) {
	for i := 0; i < b.N; i++ {
		_ = GetKernelPreset("default")
	}
}
