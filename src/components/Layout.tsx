import { useState, useEffect } from "react";
import { Outlet, useLocation, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Home,
  User,
  LogIn,
  LogOut,
  Menu,
  X,
  DollarSign,
  FileText,
  Brain,
  Github,
  Twitter,
  Linkedin,
  Mail,
  Shield,
} from "lucide-react";

const Layout = () => {
  const location = useLocation();
  const {
    user,
    isAuthenticated,
    signOut,
    isLoading: isAuthLoading,
  } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Check if current page is an auth confirmation page where we should hide header/footer
  const isAuthConfirmationPage =
    location.pathname === "/auth/confirm" ||
    location.pathname === "/reset-password";

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-gray-950 relative">
      {isAuthConfirmationPage ? (
        <main className="flex-1 bg-gray-950">
          <Outlet />
        </main>
      ) : (
        <>
          <header
            className={`sticky top-0 z-50 transition-all duration-300 ${
              scrolled
                ? "bg-gray-900/90 backdrop-blur-md border-b border-gray-800"
                : "bg-gray-900 border-b border-gray-800"
            }`}
          >
            <div className="container mx-auto px-4 py-4 flex items-center justify-between h-16">
              <Link to="/" className="flex items-center space-x-2">
                <div className="relative">
                  <Brain className="h-8 w-8 text-blue-500" />
                  <div className="absolute -inset-1 bg-blue-500/30 rounded-full blur-md -z-10"></div>
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                  BioVision AI
                </span>
              </Link>

              {/* Desktop Navigation */}
              <nav className="hidden md:flex items-center space-x-8">
                <Link
                  to="/"
                  className={`text-sm font-medium transition-colors hover:text-blue-400 ${
                    location.pathname === "/"
                      ? "text-blue-400"
                      : "text-gray-300"
                  }`}
                >
                  Home
                </Link>
                <Link
                  to="/scan-analysis"
                  className={`text-sm font-medium transition-colors hover:text-blue-400 ${
                    location.pathname === "/scan-analysis"
                      ? "text-blue-400"
                      : "text-gray-300"
                  }`}
                >
                  Scan Analysis
                </Link>
                {isAuthenticated && (
                  <Link
                    to="/dashboard"
                    className={`text-sm font-medium transition-colors hover:text-blue-400 ${
                      location.pathname.includes("dashboard")
                        ? "text-blue-400"
                        : "text-gray-300"
                    }`}
                  >
                    Dashboard
                  </Link>
                )}
                <Link
                  to="/pricing"
                  className={`text-sm font-medium transition-colors hover:text-blue-400 ${
                    location.pathname === "/pricing"
                      ? "text-blue-400"
                      : "text-gray-300"
                  }`}
                >
                  Pricing
                </Link>
              </nav>

              <div className="hidden md:flex items-center space-x-4">
                {isAuthenticated ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        className="relative h-8 w-8 rounded-full bg-gray-800 border border-gray-700 text-gray-300 hover:bg-blue-700 hover:text-white"
                      >
                        <User className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      className="w-56 bg-gray-900 border border-gray-800 text-gray-300"
                      align="end"
                      forceMount
                    >
                      <DropdownMenuLabel className="font-normal">
                        <div className="flex flex-col space-y-1">
                          <p className="text-sm font-medium leading-none text-white">
                            {user?.full_name}
                          </p>
                          <p className="text-xs leading-none text-gray-400">
                            {user?.email}
                          </p>
                          <div className="flex items-center mt-1">
                            <span className="text-xs bg-blue-900/50 text-blue-400 rounded-full px-2 py-0.5">
                              {user?.subscriptionPlan}
                            </span>
                          </div>
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator className="bg-gray-800" />
                      <DropdownMenuItem
                        asChild
                        className="focus:bg-blue-700 focus:text-white hover:bg-blue-700 hover:text-white"
                      >
                        <Link
                          to="/dashboard"
                          className="cursor-pointer w-full flex items-center"
                        >
                          <FileText className="mr-2 h-4 w-4" />
                          <span>Dashboard</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-gray-800" />
                      <DropdownMenuItem
                        onClick={signOut}
                        className="cursor-pointer focus:bg-blue-700 focus:text-white hover:bg-blue-700 hover:text-white"
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Log out</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <>
                    <Button
                      asChild
                      variant="ghost"
                      className="border-gray-700 text-white hover:bg-gray-800  hover:text-white"
                    >
                      <Link to="/login">
                        <LogIn className="mr-2 h-4 w-4" />
                        Log in
                      </Link>
                    </Button>
                    <Button
                      asChild
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <Link to="/register">Sign up</Link>
                    </Button>
                  </>
                )}
              </div>

              {/* Mobile Menu Button */}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden text-gray-300 hover:text-white hover:bg-blue-700"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X /> : <Menu />}
              </Button>
            </div>

            {/* Mobile Navigation Menu */}
            {mobileMenuOpen && (
              <div className="md:hidden border-t border-gray-800 bg-gray-900">
                <div className="container mx-auto px-4 py-3 flex flex-col space-y-3">
                  <Link
                    to="/"
                    className="flex items-center py-2 text-gray-300 hover:text-blue-400"
                  >
                    <Home className="mr-2 h-4 w-4" />
                    <span>Home</span>
                  </Link>

                  <Link
                    to="/scan-analysis"
                    className="flex items-center py-2 text-gray-300 hover:text-blue-400"
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    <span>Scan Analysis</span>
                  </Link>

                  {isAuthenticated && (
                    <Link
                      to="/dashboard"
                      className="flex items-center py-2 text-gray-300 hover:text-blue-400"
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      <span>Dashboard</span>
                    </Link>
                  )}

                  <Link
                    to="/pricing"
                    className="flex items-center py-2 text-gray-300 hover:text-blue-400"
                  >
                    <DollarSign className="mr-2 h-4 w-4" />
                    <span>Pricing</span>
                  </Link>

                  {isAuthenticated ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          className="justify-start w-full px-0 py-2 text-gray-300 hover:text-blue-400 hover:bg-transparent flex items-center"
                        >
                          <User className="h-4 w-4" />
                          <span>My Account</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        className="w-56 bg-gray-900 border border-gray-800 text-gray-300"
                        align="end"
                        forceMount
                      >
                        <DropdownMenuLabel className="font-normal">
                          <div className="flex flex-col space-y-1">
                            <p className="text-sm font-medium leading-none text-white">
                              {user?.full_name}
                            </p>
                            <p className="text-xs leading-none text-gray-400">
                              {user?.email}
                            </p>
                            <div className="flex items-center mt-1">
                              <span className="text-xs bg-blue-900/50 text-blue-400 rounded-full px-2 py-0.5">
                                {user?.subscriptionPlan}
                              </span>
                            </div>
                          </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator className="bg-gray-800" />
                        <DropdownMenuItem
                          asChild
                          className="focus:bg-blue-700 focus:text-white hover:bg-blue-700 hover:text-white"
                        >
                          <Link
                            to="/dashboard"
                            className="cursor-pointer w-full flex items-center"
                          >
                            <FileText className="mr-2 h-4 w-4" />
                            <span>Dashboard</span>
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-gray-800" />
                        <DropdownMenuItem
                          onClick={signOut}
                          className="cursor-pointer focus:bg-blue-700 focus:text-white hover:bg-blue-700 hover:text-white"
                        >
                          <LogOut className="mr-2 h-4 w-4" />
                          <span>Log out</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    <div className="flex flex-col space-y-2 pt-2">
                      <Button
                        asChild
                        variant="ghost"
                        className="border-gray-700 text-white hover:bg-gray-800  hover:text-white"
                      >
                        <Link to="/login">
                          <LogIn className="mr-2 h-4 w-4" />
                          Log in
                        </Link>
                      </Button>
                      <Button
                        asChild
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        <Link to="/register">Sign up</Link>
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </header>

          <main className="flex-1 bg-gray-950">
            <Outlet />
          </main>

          <footer className="bg-gray-900 border-t border-gray-800">
            <div className="container mx-auto px-4 py-8 md:py-12">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
                <div className="col-span-2 md:col-span-1 mb-6 md:mb-0">
                  <div className="flex items-center space-x-2 mb-4">
                    <Brain className="h-6 w-6 text-blue-500" />
                    <span className="text-lg font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                      BioVision AI
                    </span>
                  </div>
                  <p className="text-gray-400 text-sm mb-4">
                    Advanced AI for precise chest X-ray analysis, helping
                    healthcare professionals make faster, more accurate
                    diagnoses.
                  </p>
                  <div className="flex space-x-5">
                    <a
                      href="#"
                      className="text-gray-400 hover:text-blue-400 transition-colors"
                      aria-label="Twitter"
                    >
                      <Twitter className="h-6 w-6" />
                    </a>
                    <a
                      href="#"
                      className="text-gray-400 hover:text-blue-400 transition-colors"
                      aria-label="LinkedIn"
                    >
                      <Linkedin className="h-6 w-6" />
                    </a>
                    <a
                      href="#"
                      className="text-gray-400 hover:text-blue-400 transition-colors"
                      aria-label="GitHub"
                    >
                      <Github className="h-6 w-6" />
                    </a>
                    <a
                      href="#"
                      className="text-gray-400 hover:text-blue-400 transition-colors"
                      aria-label="Email"
                    >
                      <Mail className="h-6 w-6" />
                    </a>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium text-white mb-3">Platform</h3>
                  <ul className="space-y-3 text-sm text-gray-400">
                    <li>
                      <Link
                        to="/scan-analysis"
                        className="hover:text-blue-400 transition-colors block py-1"
                      >
                        X-ray Analysis
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="/"
                        className="hover:text-blue-400 transition-colors block py-1"
                      >
                        AI Technology
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="/"
                        className="hover:text-blue-400 transition-colors block py-1"
                      >
                        API Access
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="/"
                        className="hover:text-blue-400 transition-colors block py-1"
                      >
                        Integrations
                      </Link>
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-medium text-white mb-3">Resources</h3>
                  <ul className="space-y-3 text-sm text-gray-400">
                    <li>
                      <Link
                        to="/pricing"
                        className="hover:text-blue-400 transition-colors block py-1"
                      >
                        Pricing
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="/"
                        className="hover:text-blue-400 transition-colors block py-1"
                      >
                        Documentation
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="/"
                        className="hover:text-blue-400 transition-colors block py-1"
                      >
                        Research
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="/"
                        className="hover:text-blue-400 transition-colors block py-1"
                      >
                        Case Studies
                      </Link>
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-medium text-white mb-3">Company</h3>
                  <ul className="space-y-3 text-sm text-gray-400">
                    <li>
                      <Link
                        to="/"
                        className="hover:text-blue-400 transition-colors block py-1"
                      >
                        About Us
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="/"
                        className="hover:text-blue-400 transition-colors block py-1"
                      >
                        Contact
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="/"
                        className="hover:text-blue-400 transition-colors block py-1"
                      >
                        Privacy Policy
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="/"
                        className="hover:text-blue-400 transition-colors block py-1"
                      >
                        Terms of Service
                      </Link>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="border-t border-gray-800 mt-8 md:mt-12 pt-6 md:pt-8 flex flex-col md:flex-row justify-between items-center text-sm text-gray-500">
                <div className="flex items-center mb-4 md:mb-0">
                  <Shield className="h-4 w-4 mr-2 text-blue-500" />
                  <span>HIPAA Compliant & ISO 27001 Certified</span>
                </div>
                <p className="text-center md:text-left">
                  © {new Date().getFullYear()} BioVision AI. All rights
                  reserved.
                </p>
              </div>
            </div>
          </footer>
        </>
      )}

      {isAuthLoading && (
        <div className="fixed inset-0 bg-gray-950/70 backdrop-blur-sm flex items-center justify-center z-[100]">
          <div className="bg-gray-900/80 backdrop-blur-xl rounded-2xl p-8 shadow-[0_0_40px_rgba(59,130,246,0.3)] border border-blue-500/20 flex flex-col items-center">
            <div className="relative">
              <Brain className="h-12 w-12 text-blue-500 mb-6 animate-pulse" />
              <div className="absolute -inset-1 bg-blue-500/30 rounded-full blur-md -z-10"></div>
            </div>
            <div className="h-28 w-28 relative">
              <div className="absolute inset-0 rounded-full border-4 border-blue-600/20"></div>
              <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-700 animate-spin duration-1000"></div>
              <div className="absolute inset-[6px] rounded-full border-3 border-transparent border-t-blue-500 animate-spin duration-700 animate-reverse"></div>
              <div className="absolute inset-[12px] rounded-full border-2 border-transparent border-t-blue-400 animate-spin duration-500"></div>
              <div className="absolute inset-[18px] rounded-full bg-gradient-to-tr from-blue-600/20 to-cyan-400/20 animate-pulse"></div>
            </div>
            <div className="mt-6 text-center">
              <p className="text-blue-400 font-medium tracking-wider animate-pulse">
                LOADING
              </p>
              <div className="flex justify-center gap-1 mt-1">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-bounce delay-100"></span>
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-bounce delay-200"></span>
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-bounce delay-300"></span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;
