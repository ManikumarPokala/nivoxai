eval:
	python eval/run_ranking_eval.py --dataset eval/datasets/sample.jsonl --k 5,10
	python eval/run_rag_eval.py --dataset eval/datasets/sample.jsonl --k 5,10

eval-ranking:
	python eval/run_ranking_eval.py --dataset eval/datasets/sample.jsonl --k 5,10

eval-rag:
	python eval/run_rag_eval.py --dataset eval/datasets/sample.jsonl --k 5,10

eval-save:
	docker compose up -d backend-ai
	docker exec -i nivoxai-backend-ai sh -c "PYTHONPATH=/app python /app/eval/save_results.py && cat /app/eval/results.md" > eval/results.md

db-reset:
	docker compose exec -T postgres psql -U $${POSTGRES_USER} -d $${POSTGRES_DB:-nivoxai} -f /docker-entrypoint-initdb.d/analytics.sql

db-seed:
	docker compose up -d backend-api
	docker exec -i nivoxai-backend-api npm run seed:analytics

test-ai:
	if [ -t 0 ]; then docker exec -it nivoxai-backend-ai python -m pytest -q; else docker exec -i nivoxai-backend-ai python -m pytest -q; fi

test-api:
	cd backend-api && npm test

test: test-api test-ai

.DEFAULT_GOAL := help

.PHONY: help check-shell-mistake db-seed-check onboard verify check-onboard eval-save demo test test-api test-ai db-seed

help:
	@echo "make onboard        # full clean flow"
	@echo "make verify         # fast check"
	@echo "make db-seed        # seed analytics"
	@echo "make demo           # run demo"
	@echo "make check-onboard  # guidance only"
	@echo "Do not paste Makefile lines into zsh; run: make <target>"

check-shell-mistake:
	@echo "Do NOT paste Makefile lines into zsh."
	@echo "Only run \`make <target>\` in terminal."
	@echo "Example: make onboard"

db-seed-check:
	@docker exec -i nivoxai-backend-api test -f /app/scripts/seed-analytics.ts

verify:
	docker compose up -d --build
	$(MAKE) test
	$(MAKE) db-seed-check

onboard:
	@echo "Full onboarding: clean -> build -> verify -> seed -> eval -> demo"
	docker compose down -v
	docker compose up -d --build
	$(MAKE) test
	$(MAKE) db-seed-check
	$(MAKE) db-seed
	$(MAKE) eval-save
	$(MAKE) demo

check-onboard:
	@echo "Run ONE of the following:"
	@echo " make onboard # full clean flow"
	@echo " make verify # fast check"

demo:
	./scripts/demo.sh
