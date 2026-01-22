package engine

// EngineStatus represents the status of an engine
type EngineStatus string

const (
	StatusOff   EngineStatus = "OFF"
	StatusOn    EngineStatus = "ON"
	StatusBusy  EngineStatus = "BUSY"
	StatusError EngineStatus = "ERROR"
)

// Engine defines the interface that all engines must implement
type Engine interface {
	Name() string
	Start() error
	Stop() error
	Status() EngineStatus
}


