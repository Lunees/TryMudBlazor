﻿namespace TryMudBlazor.Client.Components
{
    using System.Collections.Generic;
    using System.Threading.Tasks;
    using TryMudBlazor.Client.Services;
    using Microsoft.AspNetCore.Components;
    using MudBlazor;

    public partial class TabManager
    {
        private const int DefaultActiveIndex = 0;

        private bool tabCreating;
        private bool shouldFocusNewTabInput;
        private string newTab;
        private ElementReference newTabInput;
        private string previousInvalidTab;

        [Parameter]
        public IList<string> Tabs { get; set; }

        [Parameter]
        public EventCallback<string> OnTabActivate { get; set; }

        [Parameter]
        public EventCallback<string> OnTabClose { get; set; }

        [Parameter]
        public EventCallback<string> OnTabCreate { get; set; }

        [Inject]
        public ISnackbar Snackbar { get; set; }

        private int ActiveIndex { get; set; } = DefaultActiveIndex;

        private string TabCreatingDisplayStyle => this.tabCreating ? string.Empty : "display: none;";

        protected override async Task OnAfterRenderAsync(bool firstRender)
        {
            if (this.shouldFocusNewTabInput)
            {
                this.shouldFocusNewTabInput = false;

                await this.newTabInput.FocusAsync();
            }

            await base.OnAfterRenderAsync(firstRender);
        }

        private Task ActivateTabAsync(int activeIndex)
        {
            if (activeIndex < 0 || activeIndex >= this.Tabs.Count)
            {
                return Task.CompletedTask;
            }

            this.ActiveIndex = activeIndex;

            return this.OnTabActivate.InvokeAsync(this.Tabs[activeIndex]);
        }

        private async Task CloseTabAsync(int index)
        {
            if (index < 0 || index >= this.Tabs.Count)
            {
                return;
            }

            if (index == DefaultActiveIndex)
            {
                return;
            }

            var tab = this.Tabs[index];
            this.Tabs.RemoveAt(index);

            await this.OnTabClose.InvokeAsync(tab);

            if (index == this.ActiveIndex)
            {
                await this.ActivateTabAsync(DefaultActiveIndex);
            }
        }

        private void InitTabCreating()
        {
            this.tabCreating = true;
            this.shouldFocusNewTabInput = true;
        }

        private void TerminateTabCreating()
        {
            this.tabCreating = false;
            this.newTab = null;
        }

        private async Task CreateTabAsync()
        {
            if (string.IsNullOrWhiteSpace(this.newTab))
            {
                this.TerminateTabCreating();
                return;
            }

            var normalizedTab = CodeFilesHelper.NormalizeCodeFilePath(this.newTab, out var error);
            if (!string.IsNullOrWhiteSpace(error) || this.Tabs.Contains(normalizedTab))
            {
                if (this.previousInvalidTab != this.newTab)
                {
                    Snackbar.Add("File already exists.", Severity.Warning);
                    this.previousInvalidTab = this.newTab;
                }

                await this.newTabInput.FocusAsync();
                return;
            }

            this.previousInvalidTab = null;

            this.Tabs.Add(normalizedTab);

            this.TerminateTabCreating();
            var newTabIndex = this.Tabs.Count - 1;

            await this.OnTabCreate.InvokeAsync(normalizedTab);

            await this.ActivateTabAsync(newTabIndex);
        }
    }
}
