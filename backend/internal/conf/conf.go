package conf

// Bootstrap 配置引导
type Bootstrap struct {
	Server *Server `json:"server"`
	Data   *Data   `json:"data"`
	Auth   *Auth   `json:"auth"`
}

// Server 服务器配置
type Server struct {
	Http *Http `json:"http"`
	Grpc *Grpc `json:"grpc"`
}

// Http HTTP服务器配置
type Http struct {
	Addr    string `json:"addr"`
	Timeout string `json:"timeout"`
}

// Grpc gRPC服务器配置
type Grpc struct {
	Addr    string `json:"addr"`
	Timeout string `json:"timeout"`
}

// Data 数据层配置
type Data struct {
	MongoDB *MongoDB `json:"mongodb"`
	Redis   *Redis   `json:"redis"`
}

// MongoDB MongoDB配置
type MongoDB struct {
	Uri      string `json:"uri"`
	Database string `json:"database"`
}

// Redis Redis配置
type Redis struct {
	Addr     string `json:"addr"`
	Password string `json:"password"`
	DB       int    `json:"db"`
}

// Auth 认证配置
type Auth struct {
	Secret string `json:"secret"`
	Expire string `json:"expire"`
}