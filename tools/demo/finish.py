"""What Claude files in each of the demo's examples, applied to the seeded notebook (seed.py)."""
import json, os, sys
from datetime import datetime, timedelta, timezone
sys.path.insert(0, sys.path[0])
from remry import call
HERE = sys.path[0]
ids = json.load(open(os.path.join(HERE, "ids.json")))
days = lambda n: (datetime.now(timezone.utc) + timedelta(days=n)).strftime("%Y-%m-%dT00:00:00.000Z")

# 1. An org change.
dana = call("person.create", name="Dana Park", extensions={"org": {"title": "Senior Engineer"}})["id"]
ids["Dana Park"] = dana
call("personRelation.add", fromId=ids["Priya Shah"], toId=dana, kind="LEAD_OF")
call("group.addMember", groupId=ids["Platform"], personId=dana)
call("group.addMember", groupId=ids["Engineering"], personId=dana)

# 2. After a 1:1.
call("note.add", entityType="PERSON", entityId=dana,
     content="Wants to lead the Q4 migration. Said the on-call rotation is the part she’d change first.")
call("todo.create", title="Book 1:1 with Dana", priority=2, entityType="PERSON", entityId=dana, targetDate=days(7))

# 3. A blocked project.
sr = ids["Search rewrite"]
call("project.update", id=sr, status="blocked")
call("note.add", entityType="PROJECT", entityId=sr, content="Blocked until the new search index ships.")
call("todo.create", title="Chase Tom on the search index", priority=1, entityType="PROJECT", entityId=sr)

# 4. A goal check-in.
call("goal.checkIn", goalId=ids["Cut p95 latency to 200ms"], date="2026-09-10T00:00:00.000Z", value=310,
     status="ON_TRACK", comment="Read replicas took another 80ms off.")

# 5. A wiki page.
dd = call("page.create", title="Datadog", content="- **Vendor:** Datadog\n- **Cost:** $40,000 a year, 40 seats\n"
          "- **Renews:** March 2027\n\nMonitoring and alerting. Platform owns the account.")["id"]
ids["Datadog"] = dd
call("relation.add", fromType="GROUP", fromId=ids["Platform"], toType="PAGE", toId=dd, note="Uses it for alerting")

# 6. Writing up the quarter.
doc = call("doc.add", entityType="GROUP", entityId=ids["Platform"], title="Q3 review")["id"]
ids["Q3 review"] = doc
md = open(os.path.join(HERE, "q3.md")).read().replace("{{migration}}", f"/app/projects/{ids['Q4 migration']}") \
    .replace("{{datadog}}", f"/app/wiki/{dd}")
call("doc.update", id=doc, content=md)

json.dump(ids, open(os.path.join(HERE, "ids.json"), "w"), indent=1)
print("finished", len(ids))
