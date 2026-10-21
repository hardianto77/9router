package bypass

import (
	"crypto/aes"
	"crypto/cipher"
	"encoding/base64"
	"fmt"
	"sync"
)

// Master encryption key components (obfuscated at compile-time)
var (
	_k0 = []byte{0x58, 0x52, 0x6f, 0x75, 0x74, 0x65, 0x72, 0x53} // "XRouterS"
	_k1 = []byte{0x65, 0x63, 0x75, 0x72, 0x65, 0x4b, 0x65, 0x72} // "ecureKer"
	_k2 = []byte{0x6e, 0x65, 0x6c, 0x56, 0x61, 0x75, 0x6c, 0x74} // "nelVault"
	_k3 = []byte{0x4b, 0x65, 0x79, 0x32, 0x30, 0x32, 0x36, 0x21} // "Key2026!"
)

// Pre-compiled AES-256-GCM encrypted vaults
// Zero plaintext prompt strings in the binary or source control.
const (
	vaultDefaultCiphertext = "7WiuYntpLfXg6QdtLr0wsJR3iyeQ43u7UsTifwj/s2wv2B5W5BmAuA8268fANPRrZitP1iAAPZaZ6P21hbluVisiX4fdDa4uYfY6aijZ6ql9al7lRrbpTuadw20481JZcE4jRpqZQAoMGroYs678SKriF+7a7hvzEvG9cr/Ag3QA1eptMaFXiQIStHh4xvpedw73+VBFmWca1G7rSLrlhMMjAsw4cxwj7hhNsy2qfFFS4UEtSo1voZwpojx5Uh1L/ibtqvQYWcBGix73+URcsFbwu5nJnF+2uzV7U18+p5Xktp8N/uxbBxuudaZ6i1uJpJfd50whXzHRtgvM6rl/kSmk9mSWcI4eRUKlLNNgIlLON1ih5AbDFBYGRxXZwibIkJEVEmrX/e31FgfwZYwMS17ZFMw6LW8rSpZKsUF4HlvcX+5sy+3cUs17DLFSj4UXNmyvUMPRQkJ94pBIvvu7xfoaeS4Rtj4+mvwrgmRzK3REyLJoZYLcviu11Oh+oYPU20RpCNX85n96a+YJGPHmAKjqutW8xOnr/WszhKTHjR9rQjST19FMcI0BtasDdo9Cu+q+hthEBVjiDSzL1qeM1crE9um67/1/r5uLLymCnxxRhcLz67vqXoX3k4sdcm3ar0u7ajnC+EVelJTUaDf7KU2LbpvgGJiLUFvWbevpP670lfhG7W/5UoIZnq0C+VnldBZ8vT2LNLhhtzW8abR//sg3nIS86aV6vAarv9DrQ0FdSlHTRwyrMHoFeCSCRgXAi523vhE/h4TnsU35YkXzGyS/R/ATsM7jvSwahwPRQTG90fYFsg5eE2EpjoIHllUo+xxbGYyvjhK8TqQqiPdF7Sqygxmfudr79w94twdboEzO66gHfxGUrIekSlAk6eZnrmic3D/BnrHjOzzkqKlE4qLpm6ZgSVWoZVq7jNPzoNl9mGQoM1wzsaOcAjFaAJAy1HiaHMHlmZIO1B9I93DTT5OyTQ1psKcaT5/xnCxlsqnIvl/ND1jrRwQbBsXV71ffQYf5qJEKIX3+grdM8wEHsUjE9GCDTgkb0VgAaPzH34BKAPUz6wY3n7sq4eJe153uWNKBh66cL84oEcSmlDkwuCf3crW0eeTIJEaCRY49cnqvZp1qQe5lWPKEMl52zSvPbCgGeu2CopLLUKSonixhvuDKZRCPilIWyjbOqdnj7zDclTv2OPFopfbjz0k28xLrrIW2etsFhS4BksqQ0yczoWr3WmJAWlujua6VEy0q8fcc9t0EX6r1N8hq803sm4eH6IapOHiS8O2YpakA6iFeczOVWgI+0ZW2DxMY2F6YGy5dVIpXsHys5iss1TCRAiX9rJ4u4RZsEIbGnbMeSVgEhAxW3JJ8TQxfoHufnnfWarGhIR9KJDP67f29+0cTVvBbF8xrmGfM/+o99ONaToNFo6eCWpV1OHnjhbawyMSwJysLsS4t4Jm/a9YBqVLK050Bm4Yl77nESS4TZJDzEsuqS9KAJUAZmGFsREBLFPyTpAjwUlZmVI6be+P3bCvzm9UD93TWQ9fVVb4N5lMqsSnVyMEG1t/1RQ40z/YgngNfQPmPhRG+NrWjvMa4H/CVI4Hi40xScbxRAhqrDdU2BBMmZs5pSQk30iJ/6/T3MmHB3iu6C+oozEtCi6MnPIQkFG50ctc9iIagTw=="

	vaultRawCiphertext = "sFZT4Drffyxr3AvfDRT02I0Z1l26MoBSZzSuUckcs/lwQ/2oAFXm02XeM4e6+dGEwMfPQZQDa6UknVw6ueYz4F+umT2TE9DAU9iCCVBvpTeEoWGQSa6XHzoYSmOD95T+6bRxM5H9gI7KNqly+1NwyiSPyQY7KxJOilzhbtdnvK2RespeaVoWXwdc3wVKPlDcg+d++VWTQAMjGG1+vFakaE+psoTL+ebbZGA+leP6Eodb16BOhCz9fDE6xeAukIQVG71sSY6mtFaQzlcLkQK0weTzZMgyxzriYdahPPYrZb+NgeYJa24cPAv9ronTFchp/zCuDcKvDwYzNb6ToAajedzoZc+B5wN2jAGYEevppptFeX4/3/ojePrQxpDY+dalZzDuJQa6+qsivCURdsTGJWvQxAc5XVgwiXgolHn2F6uyAa+vUDRwPwCFSS08NxfMaC7vmcpn31rAlyZA13e2IzaWRrAnWkWmRjgdtk7HUhC4j2OA/a3PtmDq0Af2h2QSsHh52bLS4INWB7F9zRmubhGgFQgeADkwRtr52LhehUJ2ahSQv89PRmpbvXvW32hgCHfEaTxJejcUnxDZL8nMPfsxFWiuIxL0xET2YanyzHntl1QPxFSzzDdp2nn7lj8mT6iZEJu8xW0BHICTCPGHU43XX4VOaqTGlebXg1Ku77Shk7h6mBULhL7gX/TwZpjVbOnZKzHDDVJ1iNAYKdiDtgdFxB3LHS9I0Fs+uuWp4T6SDtMUF1urPgos+ImuFVc0xPgotvpcxIx62wNtW4VmdyjkcQT78FthHpUV52WwlTzItq4UIPs86xPkguWRy8jBmXgGmMGJesBttm8oNL1ZiFPKocGiW4vMjhewqplNFruWc9ANGck6vffLvjcNcmgZ0l8YcVHABn1NUpAyRdWWprvCxZJLLu6sVsWoYjMLHdgapLg+PfomhTkPFyigyLatGitcvqKbkiGP2/WD8EmrpSpr5N5UJ4RnCzpcAnrRtTJv7msBI83eAJkC6DKKmoyUU9sAUyXjPeqsGudaz5zykpeD5yhHSw59PzM5Zw3OT7zvwxakjGGdCCPzCHsH1oVf+ipLaIV+cBDQ/1UH0FfOdCTuzR9FFSyrdkugzjg9/kAsvDedhodAAPOUNBBAvQ=="

	vaultSovereignCiphertext = "xx5P2AZAMjnrgbawKNBSL0PAfxgkfUoDfQJzfEzDiJSDevCGemCuPL+p/voTgkLuszAikETNCfY8L605easNOeE6ucvOM1qqifJgM7Y+X8QPqK77ARbjXVHt0iWIrFwtde7mtjD++WbZTZfV8LtRwzzyAgGmrnuHGxh9Y0UJHAuFrFxBTshekcy9glg9i5wfZ1ImtMXkFW4OOdl2TqrGwC08PGjeeT50S7DZ/1rFXtGIKRzj25/cqtnLAT69m8qVqLrrWWJTHfGUrpE9zoJUnA6wDympoNAiyI6cQXwE9sc368D64Q1zwiN1rb6dax4YxfPujwMU2xGaEVNjaLaGNwOkPIXtgKFAv/xNOVS6lhs9gUDWfkyzk4jzj8NNtRq6oPohBMyDS2fvpQCy35klsaIPWJbT2AkZC1JRECShbLLMys/RK3ZmtNg5z3QpN7vHw3hdgusOMPECCY83wKy/qqZVchp262xholACCpEPZ3syYJm1/0Bx3Zhj82nkcLH2Yo9WVveYM/7Ghq668Zp5t4cYllj23yjha0JFTKID6RklL85FU529PaWYT9+hjlVbht3aLhqi8u+uExNPIcecyR1hHAB+i3Ln44akhEk2uSkkV6KP2Ra0kMvuwOTDZhwm4vRBcAetentq9DUvn5rjMkF/3md71o1xWLmO3IThfhj3GC+Oq5bZVWiAp4/BCMHd1abjVK2lPJWRECrUTHDoiy9GDn9R98bS2d0N6MhLFwZz7lbhi9NoQjYXXgaG/gxff8LZnM+wAoJ2KAx13BrWq7N4cbMWKKpJ1ujAMHrsTQK52lccj33r66TnglVoZTI2EkNpYxAid8fLS/GrASoZ4PCWCMgDjDkRLBziEm+w6rxeWAaFd5BaABACd5MzuQ0vSJoFVQUtopgV2V3d61QqIxw0rmnweqGtgCuYiJ1qV26ymTxUiuwkobLx97YHu5Kh7ILbsN6dVWf6EecHFzVASzV1d5hjHBwTgFCYUaGENRtXO7X0AaotgPICZRfuOwZ2r/QqsFzv0CVGbYdBhg=="
)

var (
	cacheMu       sync.RWMutex
	decryptedCache = make(map[string]string)
)

func decryptVault(encoded string) (string, error) {
	cacheMu.RLock()
	if cached, ok := decryptedCache[encoded]; ok {
		cacheMu.RUnlock()
		return cached, nil
	}
	cacheMu.RUnlock()

	raw, err := base64.StdEncoding.DecodeString(encoded)
	if err != nil {
		return "", fmt.Errorf("invalid vault encoding: %w", err)
	}

	if len(raw) < 12+16 {
		return "", fmt.Errorf("ciphertext too short")
	}

	// Reconstruct 32-byte key
	var key [32]byte
	copy(key[0:8], _k0)
	copy(key[8:16], _k1)
	copy(key[16:24], _k2)
	copy(key[24:32], _k3)

	block, err := aes.NewCipher(key[:])
	if err != nil {
		return "", err
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	nonce := raw[:12]
	ciphertext := raw[12:]

	plaintext, err := gcm.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		return "", fmt.Errorf("vault verification failed: %w", err)
	}

	result := string(plaintext)
	cacheMu.Lock()
	decryptedCache[encoded] = result
	cacheMu.Unlock()

	return result, nil
}
