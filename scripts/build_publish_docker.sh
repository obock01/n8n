#!/bin/bash

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )/../" &> /dev/null && pwd )
echo "SCRIPT_DIR: $SCRIPT_DIR"

function build_docker() {
	docker build --build-arg N8N_VERSION=0.174.0 -f "$SCRIPT_DIR/docker/images/n8n-custom/Dockerfile" -t ocdev.azurecr.io/n8n-custom "$SCRIPT_DIR/."
}

function push_docker() {
	docker push ocdev.azurecr.io/n8n-custom:latest
}

function login_docker() {
	docker login -p jxE30mgWIRftjaUqvlpVX1dd/d+Sbpb/ -u ocdev ocdev.azurecr.io
}

login_docker
if [ $? -eq 0 ]; then
	build_docker
	if [ $? -eq 0 ]; then
		push_docker
		if [ $? -eq 0 ]; then
			echo "Docker image pushed successfully"
		else
			echo "Docker image push failed"
		fi
	else
		echo "Docker image build failed"
	fi
else
	echo "Failed to login to Azure Repository"
fi

