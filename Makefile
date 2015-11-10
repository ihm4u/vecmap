DISTDIR=editions/tidgraph/plugins/tidgraph
SRCDIR=src/plugins/tidgraph
JSSRC = utils.js widget.js
SRC= plugin.info $(shell cd $(SRCDIR) > /dev/null && ls *.tid doc/*.tid)
TARGETS=$(addprefix $(DISTDIR)/,$(JSSRC) $(SRC))
PROD=yes
$(info $(SRC))

.PHONY: all clean serve

all: $(TARGETS)

clean:
	rm $(TARGETS)

index:
	tiddlywiki editions/tidgraph --build index
	cp editions/tidgraph/output/index.html index.html

serve:
	rm -f $(DISTDIR)/utils.js
	ln -s `readlink -f $(SRCDIR)/utils.js` $(DISTDIR)
	bin/serve editions/tidgraph;
	while inotifywait -e move_self -e modify  $(DISTDIR)/utils.js; do \
		bin/serve -k; \
		bin/serve editions/tidgraph; \
	done

$(DISTDIR)/%.js: $(SRCDIR)/%.js
	if [ -L "$@" ]; then rm -f "$@"; fi
	if [ "$(PROD)" ]; then \
		sed -ne '\#/\*\\#,\#\\\*/# p' "$^" > "$@" && \
		closure "$^" >> "$@"; \
	else \
	   cp "$^"  "$@"; \
	fi

$(DISTDIR)/plugin.info: $(SRCDIR)/plugin.info
	   cp "$^"  "$@";

$(DISTDIR)/%.tid: $(SRCDIR)/%.tid
	   cp "$^"  "$@";

$(DISTDIR)/doc/%.tid: $(SRCDIR)/doc/%.tid
	   cp "$^"  "$@";
