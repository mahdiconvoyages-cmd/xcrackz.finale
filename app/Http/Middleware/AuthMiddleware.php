<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class AuthMiddleware
{
    public function handle(Request $request, Closure $next)
    {
        if (!session('access_token')) {
            return redirect('/login')->withErrors(['error' => 'Vous devez être connecté']);
        }

        return $next($request);
    }
}
