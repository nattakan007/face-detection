import { Injectable } from "@angular/core";
import {
  CanActivate,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  Router,
} from "@angular/router";
import { AuthService } from "../services/auth.service";

@Injectable({
  providedIn: "root",
})
export class AuthGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  async canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Promise<boolean> {
    const isAuthenticated = await this.authService.isAuthenticated();

    if (!isAuthenticated) {
      // Store the attempted URL for redirecting after login
      sessionStorage.setItem("redirectUrl", state.url);

      // Redirect to scan page
      this.router.navigate(["/scan"]);
      return false;
    }

    // Extend session on each guard check (activity tracking)
    await this.authService.extendSession();

    return true;
  }
}
