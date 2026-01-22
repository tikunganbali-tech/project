package state

import (
	"fmt"
	"log"
)

// State represents the current state of AI content generation
// KONTRAK FINAL: State Machine wajib, tidak ada shortcut
type State string

const (
	// INIT - Initial state, sebelum generate
	StateInit State = "INIT"

	// GENERATE_RAW - AI menghasilkan konten mentah
	StateGenerateRaw State = "GENERATE_RAW"

	// NORMALIZE - Normalizer memaksa compliance
	StateNormalize State = "NORMALIZE"

	// VALIDATE - Validator cek struktur & kualitas
	StateValidate State = "VALIDATE"

	// STORE - Konten siap, disimpan sebagai draft
	StateStore State = "STORE"

	// QUARANTINE - Konten gagal, tidak boleh retry
	StateQuarantine State = "QUARANTINE"

	// RETRY - Retry dengan input sama
	StateRetry State = "RETRY"
)

// StatusCode represents the status code for content
type StatusCode string

const (
	StatusRawAI        StatusCode = "RAW_AI"
	StatusNormalized   StatusCode = "NORMALIZED"
	StatusValidated    StatusCode = "VALIDATED"
	StatusDraftReady   StatusCode = "DRAFT_READY"
	StatusRejected     StatusCode = "REJECTED"
	StatusRetry        StatusCode = "RETRY_*"
)

// StateMachine manages the state transitions for AI content generation
// KONTRAK FINAL: State machine wajib, tidak ada shortcut
type StateMachine struct {
	currentState State
	statusCode   StatusCode
	retryCount   int
	maxRetries   int
}

// NewStateMachine creates a new state machine
func NewStateMachine(maxRetries int) *StateMachine {
	return &StateMachine{
		currentState: StateInit,
		statusCode:   "",
		retryCount:   0,
		maxRetries:   maxRetries,
	}
}

// Transition moves to the next state
// KONTRAK FINAL: Setiap transisi harus eksplisit
func (sm *StateMachine) Transition(nextState State) error {
	// Validate transition
	if !sm.isValidTransition(sm.currentState, nextState) {
		return fmt.Errorf("invalid state transition: %s -> %s", sm.currentState, nextState)
	}

	log.Printf("[STATE MACHINE] Transition: %s -> %s", sm.currentState, nextState)
	sm.currentState = nextState

	// Update status code based on state
	switch nextState {
	case StateGenerateRaw:
		sm.statusCode = StatusRawAI
	case StateNormalize:
		sm.statusCode = StatusNormalized
	case StateValidate:
		sm.statusCode = StatusValidated
	case StateStore:
		sm.statusCode = StatusDraftReady
	case StateQuarantine:
		sm.statusCode = StatusRejected
	case StateRetry:
		sm.retryCount++
		sm.statusCode = StatusRetry
	}

	return nil
}

// isValidTransition checks if a transition is valid
// KONTRAK FINAL: State diagram harus diikuti
func (sm *StateMachine) isValidTransition(from, to State) bool {
	validTransitions := map[State][]State{
		StateInit:        {StateGenerateRaw},
		StateGenerateRaw: {StateNormalize, StateQuarantine},
		StateNormalize:   {StateValidate, StateQuarantine},
		StateValidate:    {StateStore, StateQuarantine, StateRetry},
		StateRetry:       {StateGenerateRaw, StateQuarantine},
		StateStore:       {}, // Terminal state
		StateQuarantine:  {}, // Terminal state
	}

	allowed, exists := validTransitions[from]
	if !exists {
		return false
	}

	for _, allowedState := range allowed {
		if allowedState == to {
			return true
		}
	}

	return false
}

// GetCurrentState returns the current state
func (sm *StateMachine) GetCurrentState() State {
	return sm.currentState
}

// GetStatusCode returns the current status code
func (sm *StateMachine) GetStatusCode() StatusCode {
	return sm.statusCode
}

// CanRetry checks if retry is allowed
// KONTRAK FINAL: Retry maksimal 2x
func (sm *StateMachine) CanRetry() bool {
	return sm.retryCount < sm.maxRetries
}

// GetRetryCount returns the current retry count
func (sm *StateMachine) GetRetryCount() int {
	return sm.retryCount
}

// IsTerminal checks if current state is terminal
func (sm *StateMachine) IsTerminal() bool {
	return sm.currentState == StateStore || sm.currentState == StateQuarantine
}
