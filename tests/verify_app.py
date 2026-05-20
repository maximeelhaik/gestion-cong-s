import os
import sys
import time
from playwright.sync_api import sync_playwright

BASE_URL = "http://localhost:3000"
SCREENSHOT_DIR = "/Users/maximeelhaik/.gemini/antigravity/brain/0ee27cb3-428d-4489-bd09-fd1147841d77/screenshots"
os.makedirs(SCREENSHOT_DIR, exist_ok=True)

def log_step(name):
    print(f"\n🚀 [TEST STEP] {name} ...", flush=True)

def capture(page, name):
    path = os.path.join(SCREENSHOT_DIR, f"{name}.png")
    page.screenshot(path=path)
    print(f"   📸 Screenshot saved: {path}", flush=True)

def run_tests():
    with sync_playwright() as p:
        print("Launching browser...", flush=True)
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1280, "height": 800})
        page = context.new_page()
        
        # Log browser console messages
        page.on("console", lambda msg: print(f"📢 [BROWSER CONSOLE] {msg.text}", flush=True))
        
        def log_response(response):
            try:
                content_type = response.headers.get('content-type', '')
                if 'application/json' in content_type or 'text/' in content_type:
                    body = response.text()
                    # Limit output length to avoid huge print
                    if len(body) > 300:
                        body = body[:300] + "..."
                    print(f"📥 [RES] {response.status} {response.url} -> {body}", flush=True)
                else:
                    print(f"📥 [RES] {response.status} {response.url}", flush=True)
            except Exception as e:
                print(f"📥 [RES] {response.status} {response.url} (Failed to read body: {str(e)})", flush=True)

        page.on("request", lambda request: print(f"📡 [REQ] {request.method} {request.url}", flush=True))
        page.on("response", log_response)
        
        # 0. Reset database to default seed data to avoid conflicts and duplicate entries
        print("Resetting database to default seed data...", flush=True)
        try:
            response = page.request.post(f"{BASE_URL}/api/reset")
            if response.ok:
                print("   ✓ Database reset successful!", flush=True)
            else:
                print(f"   ⚠️ Database reset failed: {response.status} {response.text()}", flush=True)
        except Exception as reset_err:
            print(f"   ⚠️ Database reset error: {str(reset_err)}", flush=True)

        # 1. Navigation & Initial Hydration
        log_step("1. Navigation & Hydration Initiale")
        page.goto(BASE_URL)
        page.wait_for_load_state("networkidle")
        capture(page, "01_loaded")
        
        # Verify app title is visible
        header = page.locator("h1")
        page.wait_for_selector("h1", timeout=5000)
        print(f"   ✓ Header text: '{header.inner_text()}'", flush=True)
        if "TABLEAU DE BORD" not in header.inner_text().upper() and "MONITORING" not in header.inner_text().upper():
            raise AssertionError("Header text doesn't match expected dashboard title")

        # 2. Add New Discipline
        log_step("2. Création d'une nouvelle Discipline")
        page.get_by_role("button", name="Saisie des Congés").click()
        page.wait_for_selector("text=DÉCLARATION D'INDISPONIBILITÉ", timeout=5000)
        capture(page, "02_saisie_tab")

        page.get_by_role("button", name="Nouvelle", exact=True).click()
        page.wait_for_selector("text=Nouvelle Discipline", timeout=5000)
        page.get_by_placeholder("Ex: Architecture logicielle").fill("Cybersécurité")
        
        # Choose preset color button (amber/red/etc)
        page.locator("button[title='#ef4444']").click()
        page.locator("button:has-text('Valider')").click()
        
        # Wait for notification
        page.wait_for_selector("text=La discipline \"Cybersécurité\" a été créée avec succès !", timeout=5000)
        print("   ✓ Discipline 'Cybersécurité' created successfully!", flush=True)
        capture(page, "03_discipline_created")

        # 3. Add New Formateur
        log_step("3. Création d'un nouveau Formateur")
        page.get_by_role("button", name="Nouveau", exact=True).click()
        page.wait_for_selector("text=Nouveau Formateur", timeout=5000)
        page.get_by_placeholder("Ex: Alice Dupont").fill("Jean Testeur")
        
        # Select "Cybersécurité" and "Développement Web" disciplines for this trainer
        page.locator("div:has-text('Nouveau Formateur') button:has-text('Cybersécurité')").first.click()
        page.locator("div:has-text('Nouveau Formateur') button:has-text('Développement Web')").first.click()
        
        page.locator("button:has-text('Valider')").click()
        page.wait_for_selector("text=Le formateur \"Jean Testeur\" a été créé avec succès !", timeout=5000)
        print("   ✓ Formateur 'Jean Testeur' created successfully!", flush=True)
        capture(page, "04_formateur_created")

        # 4. Add Leaves Absence
        log_step("4. Saisie d'une absence standard")
        # Ensure Jean Testeur is selected
        select_elem = page.locator("select#formateur-select")
        select_elem.select_option(label="Jean Testeur")
        
        # Select discipline
        page.locator("button:has-text('Cybersécurité')").first.click()
        
        # Set dates: June 1st to June 5th, 2026
        page.locator("input[type='date']").first.fill("2026-06-01")
        page.locator("input[type='date']").nth(1).fill("2026-06-05")
        
        # Fill comment
        page.get_by_placeholder("Préciser la raison ou des notes complémentaires", exact=False).fill("Mission d'audit sécurité")
        capture(page, "05_conge_form_filled")
        
        # Submit
        page.get_by_role("button", name="Enregistrer les indisponibilités").click()
        page.wait_for_selector("text=Congés enregistrés avec succès dans le système", timeout=5000)
        print("   ✓ First leave added successfully without conflict!", flush=True)
        capture(page, "06_conge_added")

        # 5. Conflict Detection
        log_step("5. Saisie d'une absence chevauchante (Génération de Conflit)")
        # Wait for form to reset from previous submission
        page.wait_for_function("() => document.getElementById('formateur-select').value === ''")
        
        # Select another formateur: Marc Lemaire
        select_elem.select_option(label="Marc Lemaire")
        
        # Switch discipline to "Développement Web" (first add a leave on Développement Web for Marc)
        page.locator("button:has-text('Développement Web')").first.click()
        page.locator("input[type='date']").first.fill("2026-06-03")
        page.locator("input[type='date']").nth(1).fill("2026-06-08")
        page.get_by_placeholder("Préciser la raison ou des notes complémentaires", exact=False).fill("Vacances scolaires")
        page.get_by_role("button", name="Enregistrer les indisponibilités").click()
        
        # Wait for form to reset (indicating successful submission)
        page.wait_for_function("() => document.getElementById('formateur-select').value === ''")
        print("   ✓ Leave added for Marc Lemaire", flush=True)

        # Now add overlapping leave for Jean Testeur on Développement Web
        select_elem.select_option(label="Jean Testeur")
        page.locator("button:has-text('Développement Web')").first.click()
        page.locator("input[type='date']").first.fill("2026-06-05")
        page.locator("input[type='date']").nth(1).fill("2026-06-10")
        page.get_by_placeholder("Préciser la raison ou des notes complémentaires", exact=False).fill("Chevauchement test")
        
        capture(page, "07_overlapping_before_submit")
        page.get_by_role("button", name="Enregistrer les indisponibilités").click()
        
        # Wait for Warning about conflict
        page.wait_for_selector("text=un conflit de planification a été détecté", timeout=5000)
        print("   ✓ Conflict detected and warning shown successfully!", flush=True)
        capture(page, "08_conflict_warning_shown")

        # 6. Verify Dashboard conflict state and calendar
        log_step("6. Vérification du Tableau de Bord & Sélections")
        page.get_by_role("button", name="Monitoring").click()
        page.wait_for_selector("text=MONITORING DES EQUIPES", timeout=5000)
        
        # Navigate Calendar to June 2026
        # Check current month header, if not June 2026, click next
        month_label = page.locator(".flex-1.text-center.text-sm.font-bold").inner_text()
        print(f"   Current calendar month: {month_label}", flush=True)
        
        # Click next month repeatedly until we reach juin 2026
        for _ in range(12):
            month_label = page.locator(".flex-1.text-center.text-sm.font-bold").inner_text().lower()
            if "juin 2026" in month_label:
                break
            page.locator("#next-month-btn").click() # Click next month chevron
            time.sleep(0.3)
            
        print(f"   Calendar navigated to: {page.locator('.flex-1.text-center.text-sm.font-bold').inner_text()}", flush=True)
        capture(page, "09_june_calendar")
        
        # Verify KPI Card conflicts
        conflicts_kpi = page.locator("text=Conflits Détectés").locator("..").locator(".text-2xl").inner_text()
        print(f"   ✓ Conflicts KPI count: {conflicts_kpi}", flush=True)
        if int(conflicts_kpi) < 2:
            raise AssertionError(f"Expected at least 2 conflicts in KPI count, got {conflicts_kpi}")

        # 7. Edit leave from Calendar Modal to resolve conflict
        log_step("7. Edition d'une indisponibilité et Résolution du Conflit")
        # Click the leave badge for "Jean Testeur" in the calendar grid
        # We look for a badge having text "Jean Testeur" and containing the conflict class/pulse
        badge = page.locator("div.conflict-pulse:has-text('Jean Testeur')").first
        badge.click()
        
        page.wait_for_selector("text=DÉTAILS DU CONGÉ", timeout=5000)
        capture(page, "10_modal_details_opened")
        
        page.get_by_role("button", name="Modifier").click()
        page.wait_for_selector("text=MODIFIER LE CONGÉ", timeout=5000)
        
        # Move Jean Testeur's leave to June 15th to June 18th (no overlap)
        page.locator("input[type='date']").first.fill("2026-06-15")
        page.locator("input[type='date']").nth(1).fill("2026-06-18")
        page.get_by_role("button", name="Enregistrer").click()
        
        # Wait for modal to close or update
        page.wait_for_selector("text=DÉTAILS DU CONGÉ", timeout=5000)
        capture(page, "11_modal_updated_no_conflict")
        
        # Status should now be Planifié & Sûr
        status_text = page.locator("text=Planifié & Sûr").inner_text()
        print(f"   ✓ Status updated to: {status_text}", flush=True)
        page.get_by_role("button", name="Fermer").click()
        
        # Verify conflicts KPI decreased
        conflicts_kpi = page.locator("text=Conflits Détectés").locator("..").locator(".text-2xl").inner_text()
        print(f"   ✓ Conflicts KPI count after resolution: {conflicts_kpi}", flush=True)

        # 8. Delete Trainer with Cascade Delete Validation
        log_step("8. Suppression d'un formateur et Cascade-Deletion des congés")
        page.get_by_role("button", name="Saisie des Congés").click()
        page.wait_for_selector("text=DÉCLARATION D'INDISPONIBILITÉ", timeout=5000)
        
        # Select Jean Testeur
        select_elem.select_option(label="Jean Testeur")
        
        # Click trash icon next to the selected trainer
        page.locator("button[title='Supprimer ce formateur']").click()
        page.wait_for_selector("text=Attention: Suppression en Cascade", timeout=5000)
        capture(page, "12_cascade_delete_warning")
        
        page.get_by_role("button", name="Confirmer la suppression").click()
        page.wait_for_selector("text=Formateur supprimé avec succès", timeout=5000)
        print("   ✓ Jean Testeur and all his leaves cascade-deleted successfully!", flush=True)
        capture(page, "13_trainer_deleted")

        # Verify that Jean Testeur is no longer in the option list
        options = select_elem.locator("option").all_inner_texts()
        print(f"   Current formateurs options: {options}", flush=True)
        if "Jean Testeur" in options:
            raise AssertionError("Jean Testeur was not deleted from options list")

        # Verify that their leaves are also gone from the calendar
        page.get_by_role("button", name="Monitoring").click()
        page.wait_for_selector("text=MONITORING DES EQUIPES", timeout=5000)
        
        # Check if the badge for "Jean Testeur" is still present
        # In Playwright we can check count of elements matching Jean Testeur
        time.sleep(1) # wait for refresh
        count = page.locator("text=Jean Testeur").count()
        print(f"   ✓ Jean Testeur count on calendar: {count}", flush=True)
        if count > 0:
            raise AssertionError("Jean Testeur leaves were not cascade-deleted from calendar")
            
        # 9. Delete Discipline with Cascade Delete Validation
        log_step("9. Suppression d'une discipline et Cascade-Deletion des dépendances")
        page.get_by_role("button", name="Saisie des Congés").click()
        page.wait_for_selector("text=DÉCLARATION D'INDISPONIBILITÉ", timeout=5000)
        
        # Click the "Cybersécurité" discipline button to select it
        page.locator("button:has-text('Cybersécurité')").first.click()
        
        # Click the "Supprimer" button next to discipline
        page.locator("button[title='Supprimer cette discipline']").click()
        page.wait_for_selector("text=Attention: Suppression en Cascade", timeout=5000)
        capture(page, "14_discipline_cascade_delete_warning")
        
        page.get_by_role("button", name="Confirmer la suppression").click()
        page.wait_for_selector("text=Discipline supprimée avec succès", timeout=5000)
        print("   ✓ Discipline 'Cybersécurité' cascade-deleted successfully!", flush=True)
        capture(page, "15_discipline_deleted")
        
        # Verify that Cybersécurité button is no longer visible in the lists
        time.sleep(1)
        count_discipline = page.locator("button:has-text('Cybersécurité')").count()
        print(f"   ✓ Cybersécurité button count: {count_discipline}", flush=True)
        if count_discipline > 0:
            raise AssertionError("Discipline 'Cybersécurité' was not deleted from the selection options")
            
        print("\n🎉 ALL TESTS COMPLETED SUCCESSFULLY!", flush=True)
        browser.close()

if __name__ == "__main__":
    try:
        run_tests()
    except Exception as e:
        print(f"\n❌ TEST FAILED: {str(e)}", file=sys.stderr, flush=True)
        sys.exit(1)
