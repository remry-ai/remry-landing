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


# 7. A sync doc: one brief from three sources, with where they disagree.
checkout = ids["New checkout"]
brief = call("doc.add", entityType="PROJECT", entityId=checkout, title="New checkout brief")["id"]
ids["New checkout brief"] = brief
call("doc.update", id=brief, content=open(os.path.join(HERE, "brief.md")).read(),
     prompt="PRD: scope and launch plan. Linear: status, dates and open issues. Pricing sheet: the tiers only. "
            "Flag any disagreement on dates or scope.")
for url, title in [("https://www.notion.so/acme/New-checkout-PRD-6f1c2a9e4b7d4e0f9a3b5c8d7e6f1a2b", "Notion: New checkout PRD"),
                   ("https://linear.app/acme/project/new-checkout-3f9a1c2e", "Linear: New checkout"),
                   ("https://docs.google.com/spreadsheets/d/1aB2cD3eF4gH5iJ6kL7mN8oP9qR0sT/edit", "Sheets: Checkout pricing")]:
    call("link.add", entityType="DOC", entityId=brief, url=url, title=title, synced=True)

# 8. A spreadsheet page: the team's software, with formulas.
money = {"type": "currency", "symbol": "$", "decimals": 0}
sheet = {"columns": [{"title": "Tool"}, {"title": "Owner"}, {"title": "Seats"},
                     {"title": "Annual cost", "format": money}, {"title": "Per seat", "format": money}, {"title": "Renews"}],
         "data": [["Datadog", "Platform", "40", "40000", "=D1/C1", "Mar 2027"],
                  ["GitHub", "Engineering", "45", "18900", "=D2/C2", "Jan 2027"],
                  ["Linear", "Engineering", "45", "6480", "=D3/C3", "Aug 2027"],
                  ["PagerDuty", "Platform", "12", "5880", "=D4/C4", "Jun 2027"],
                  ["Sentry", "Payments", "20", "6240", "=D5/C5", "Nov 2027"],
                  ["Total", "", "=SUM(C1:C5)", "=SUM(D1:D5)", "=D6/C6", ""]]}
ids["Software"] = call("page.create", title="Software", bodyType="sheet", content=json.dumps(sheet))["id"]

# 9. A drawing: the checkout architecture, as Claude writes it (a skeleton the app lays out).
blue, green, grey = "#a5d8ff", "#b2f2bb", "#e9ecef"
# Placed in a compact grid (x, y) rather than one long row, so it reads on a phone too.
box = lambda i, t, c, x, y: {"type": "rectangle", "id": i, "label": {"text": t}, "x": x, "y": y,
                             "backgroundColor": c, "fillStyle": "solid"}
drawing = {"skeleton": [
    box("app", "Web and mobile", grey, 0, 0), box("gw", "API gateway", green, 230, 0),
    box("co", "Checkout service", blue, 230, 140),
    box("pay", "Payments API v2", blue, 0, 290), box("fraud", "Fraud scoring", blue, 230, 290),
    box("db", "Orders DB", green, 460, 290),
    {"type": "ellipse", "id": "stripe", "label": {"text": "Stripe"}, "x": 10, "y": 430,
     "backgroundColor": grey, "fillStyle": "solid"},
    {"type": "arrow", "start": {"id": "app"}, "end": {"id": "gw"}},
    {"type": "arrow", "start": {"id": "gw"}, "end": {"id": "co"}},
    {"type": "arrow", "start": {"id": "co"}, "end": {"id": "pay"}, "label": {"text": "charge"}},
    {"type": "arrow", "start": {"id": "co"}, "end": {"id": "fraud"}, "label": {"text": "score"}},
    {"type": "arrow", "start": {"id": "co"}, "end": {"id": "db"}},
    {"type": "arrow", "start": {"id": "pay"}, "end": {"id": "stripe"}}]}
ids["Checkout architecture"] = call("page.create", title="Checkout architecture", bodyType="drawing",
                                    content=json.dumps(drawing))["id"]

json.dump(ids, open(os.path.join(HERE, "ids.json"), "w"), indent=1)
print("finished", len(ids))
