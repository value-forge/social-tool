.PHONY: init api generate build run clean

GOBIN := $(shell go env GOPATH)/bin

init:
	go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
	go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest
	go install github.com/google/wire/cmd/wire@latest

api:
	protoc --proto_path=./api \
		--proto_path=./third_party \
		--go_out=paths=source_relative:./api \
		--go-grpc_out=paths=source_relative:./api \
		api/socialtool/v1/*.proto

conf:
	protoc --proto_path=./internal/conf \
		--go_out=paths=source_relative:./internal/conf \
		internal/conf/conf.proto

generate:
	go generate ./...

build:
	go build -o bin/server cmd/server/main.go

run:
	go run cmd/server/main.go -conf configs/config.yaml

clean:
	rm -rf bin/
