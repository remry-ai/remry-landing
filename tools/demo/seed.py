"""The starting notebook for the demo: a team before Claude has been told anything this session."""
import json, sys
sys.path.insert(0, sys.path[0])
from remry import call
ids = {}

def person(name, title, lead=None):
    p = call("person.create", name=name, extensions={"org": {"title": title}})
    ids[name] = p["id"]
    if lead: call("personRelation.add", fromId=ids[lead], toId=p["id"], kind="LEAD_OF")
    return p["id"]
def group(kind, name, members=()):
    g = call("group.create", kind=kind, name=name); ids[name] = g["id"]
    for m in members: call("group.addMember", groupId=g["id"], personId=ids[m])
person("Alice Johnson", "Director of Engineering")
person("Marcus Lee", "Engineering Manager", "Alice Johnson")
person("Priya Shah", "Engineering Manager", "Alice Johnson")
person("Tom Reid", "Staff Engineer", "Priya Shah")
person("Ria Malik", "Product Engineer", "Marcus Lee")
person("Sam Okoro", "Senior Engineer", "Marcus Lee")
call("person.setMe", id=ids["Alice Johnson"])
group("DEPARTMENT", "Engineering", ["Alice Johnson", "Marcus Lee", "Priya Shah", "Tom Reid", "Ria Malik", "Sam Okoro"])
group("TEAM", "Platform", ["Priya Shah", "Tom Reid"])
group("TEAM", "Payments", ["Marcus Lee", "Ria Malik", "Sam Okoro"])
def project(name, status, team, start, end, parent=None, est=None):
    kw = dict(name=name, status=status, ownerType="GROUP", ownerId=ids[team],
              startDate=start + "T00:00:00.000Z", endDate=end + "T00:00:00.000Z")
    if parent: kw["parentId"] = ids[parent]
    if est: kw.update(daysOptimistic=est[0], daysLikely=est[1], daysPessimistic=est[2])
    ids[name] = call("project.create", **kw)["id"]
project("Q4 migration", "in-progress", "Platform", "2026-08-01", "2026-12-15", est=(40, 60, 90))
project("Cut-over plan", "committed", "Platform", "2026-10-01", "2026-11-15", "Q4 migration", (5, 8, 12))
project("Read replicas", "done", "Platform", "2026-08-01", "2026-09-10", "Q4 migration", (8, 10, 15))
project("Search index", "in-progress", "Platform", "2026-09-15", "2026-11-30", est=(15, 20, 30))
project("Search rewrite", "in-progress", "Platform", "2026-09-01", "2027-03-01", est=(30, 45, 70))
project("Apple Pay", "proposed", "Payments", "2026-11-01", "2027-01-31", est=(10, 15, 25))
project("New checkout", "in-progress", "Payments", "2026-08-15", "2026-12-01", est=(25, 35, 50))
project("Fraud scoring v2", "abandoned", "Payments", "2026-07-01", "2026-09-01", est=(10, 20, 30))
project("Payments API v2", "committed", "Payments", "2026-10-15", "2027-02-15", est=(20, 30, 45))
call("relation.add", fromType="PROJECT", fromId=ids["Search rewrite"], toType="PROJECT", toId=ids["Search index"], kind="DEPENDS_ON")
up = call("goal.create", title="99.9% uptime", ownerType="GROUP", ownerId=ids["Platform"], period="2026-H2", unit="%", baseline=99.5, target=99.9, status="ON_TRACK")
ids["99.9% uptime"] = up["id"]
lat = call("goal.create", title="Cut p95 latency to 200ms", ownerType="GROUP", ownerId=ids["Platform"], parentId=up["id"],
           period="2026-H2", unit="ms", baseline=480, target=200, status="ON_TRACK")
ids["Cut p95 latency to 200ms"] = lat["id"]
call("goal.checkIn", goalId=lat["id"], date="2026-07-15T00:00:00.000Z", value=480, status="ON_TRACK", comment="Starting point across the API fleet.")
call("goal.checkIn", goalId=lat["id"], date="2026-08-15T00:00:00.000Z", value=390, status="ON_TRACK", comment="Connection pooling landed.")
call("relation.add", fromType="PROJECT", fromId=ids["Read replicas"], toType="GOAL", toId=lat["id"], kind="RELATED")
call("todo.create", title="Write the migration runbook", priority=3, entityType="PROJECT", entityId=ids["Q4 migration"])
call("todo.create", title="Draft the staff engineer ladder", priority=1, entityType="GROUP", entityId=ids["Engineering"])
call("note.add", entityType="PROJECT", entityId=ids["Q4 migration"], content="Cutover window agreed for the second weekend in November.")
ids["Expense policy"] = call("page.create", title="Expense policy", content="- **Owner:** Alice Johnson\n- **Reviewed:** 2026-09\n\nTravel and equipment over $500 need approval from your manager first.")["id"]
json.dump(ids, open(sys.path[0] + "/ids.json", "w"), indent=1)
print("seeded", len(ids))
