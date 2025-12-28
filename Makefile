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
	cd backend-api && npm run seed:analytics

test-ai:
	if [ -t 0 ]; then docker exec -it nivoxai-backend-ai python -m pytest -q; else docker exec -i nivoxai-backend-ai python -m pytest -q; fi

test-api:
	cd backend-api && npm test

test: test-api test-ai

verify:
	docker compose up -d --build
	make test

demo:
	./scripts/demo.sh
