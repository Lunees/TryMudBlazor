﻿namespace TryMudBlazor.Client.Shared
{
    using System;
    using System.Net.Http;
    using System.Threading.Tasks;
    using TryMudBlazor.Client.Components;
    using Try.Core;
    using Microsoft.AspNetCore.Components;

    public partial class MainLayout : IDisposable
    {
        [Inject]
        public HttpClient HttpClient { get; set; }

        private PageNotifications PageNotificationsComponent { get; set; }

        public void Dispose() => this.PageNotificationsComponent?.Dispose();

        protected override async Task OnInitializedAsync()
        {
            await CompilationService.InitAsync(this.HttpClient);

            await base.OnInitializedAsync();
        }
    }
}
