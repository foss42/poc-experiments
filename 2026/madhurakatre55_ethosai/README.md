# Ethos AI: Agentic Bias Detection & Mitigation Framework

Ethos AI is an **Agentic AI** system designed to automate the auditing of datasets for hidden biases. By employing a multi-agent orchestration, the framework ensures high-stakes decision-making processes (like bank loans or medical screenings) remain fair and transparent.

## 🤖 Agentic Workflow
This project uses a "Crew" of specialized AI agents to handle the evaluation process:

* **BiasLens Agent 🔍:** Scans raw data to identify patterns that correlate with protected attributes (gender, race, age).
* **FixAdvisor Agent ⚖️:** Analyzes the findings from BiasLens and generates actionable mitigation strategies.
* **Updater Agent 🔄:** Monitors the model's performance over time and autonomously triggers retraining or fine-tuning when "bias drift" is detected in new incoming data.



