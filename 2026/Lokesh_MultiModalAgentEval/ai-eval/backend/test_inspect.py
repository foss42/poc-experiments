from inspect_ai import task, Task
from inspect_ai.dataset import Sample
from inspect_ai.solver import generate
from inspect_ai.scorer import match

dataset = [
    Sample(input="What is 1234 * 5678?", target="7006652"),
    Sample(input="What is 144 divided by 12?", target="12")
]

@task
def basic_agent_task():
    return Task(
        dataset=dataset,
        solver=[generate()], 
        scorer=match()
    )