﻿namespace TryMudBlazor.Client.Models
{
    using System.Collections.Generic;
    using BlazorRepl.Core;

    public class CreateSnippetRequestModel
    {
        public IEnumerable<CodeFile> Files { get; set; } = new List<CodeFile>();
    }
}
