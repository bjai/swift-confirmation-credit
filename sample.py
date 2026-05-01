import os
import random

# Create directory
folder_name = "swift_unique_samples"
if not os.path.exists(folder_name):
    os.makedirs(folder_name)

# Unique data pools to ensure variety
companies = [
    "Al-Futtaim Logistics", "Global Trade Corp", "Emirates Trading House", 
    "Sahara Distribution", "Falcon Heights LLC", "Gulf Maritime Ltd",
    "Desert Rose Imports", "Azure Blue Solutions", "Oasis Retail Group",
    "Jebel Ali Exports", "Zayed Global Ventures", "Pearl Marine Services",
    "Nomad Tech Group", "Dune Edge Enterprises", "Skyline Dubai LLC",
    "Apex Middle East", "Mirage General Trading", "Nova Logistics UAE",
    "Vertex Supply Chain", "Horizon Port Services"
]

addresses = [
    "Business Bay, Dubai", "Al Quoz Industrial, Dubai", "JLT Cluster V, Dubai",
    "Sharjah Media City", "Abu Dhabi Global Market", "Mussafah, Abu Dhabi",
    "Al Barsha 1, Dubai", "DIFC Gate Avenue, Dubai", "Hamriyah Free Zone",
    "RAK Economic Zone", "Fujairah Creative City", "Silicon Oasis, Dubai",
    "Deira City Centre", "Marina Walk, Dubai", "Bur Dubai Al Fahidi",
    "Sheikh Zayed Rd, Dubai", "Ajman Free Zone", "Khalifa City, Abu Dhabi",
    "Al Ain Industrial Area", "Investment Park, Dubai"
]

template = """{{1:F01BANKBEBBAXXX000000{id:04d}}}
{{2:I910CITIUS33XXXXN}}
{{4:
:20:TRN{trn_suffix}
:21:REF{ref_id}
:25:{account_num}
:32A:2604{day:02d}USD{amount},00
:52A:BANKBEBBXXX
:50K:/{customer_id}
{company}
{address}
:72:/REC/Payment for invoice INV-2026-{invoice}
-}}"""

for i in range(20):
    # Generating randomized but unique sets of data
    file_data = template.format(
        id=i+1,
        trn_suffix=f"202604{random.randint(100000, 999999)}",
        ref_id=random.randint(10000, 99999),
        account_num=f"{random.randint(10000000, 99999999)}{random.randint(100, 999)}",
        day=random.randint(25, 29),
        amount=random.randint(50000, 500000),
        customer_id=random.randint(1000000000, 9999999999),
        company=companies[i],
        address=addresses[i],
        invoice=random.randint(5000, 9999)
    )
    
    file_name = f"swift_unique_ref_{i+1:02d}.txt"
    with open(os.path.join(folder_name, file_name), "w") as f:
        f.write(file_data)

print(f"Generated 20 unique files in ./{folder_name}")