<?php

namespace App\Http\Controllers;

class HomeController extends Controller
{
    public function index()
    {
        if (session('access_token')) {
            return redirect('/dashboard');
        }

        return view('landing');
    }
}
