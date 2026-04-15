.PHONY: build test lint fmt fmt-check release clean docs website website-dev install bench


build:
	npm run build

test:
	npm test

lint:
	npm run lint

fmt:
	npm run fmt

fmt-check:
	npm run fmt:check

release:
	npm run build

clean:
	rm -rf dist node_modules

install:
	npm install
	npm run build
	npm link
	@command -v oil >/dev/null 2>&1 && echo "✓ 'oil' is now available in your PATH" || echo "⚠ 'oil' was not found in PATH — check that npm's global bin directory is in your PATH (run: npm config get prefix)"


docs:
	@echo "see docs/"

website:
	cd website && npm install && npm run build

website-dev:
	cd website && npm install && npm run dev