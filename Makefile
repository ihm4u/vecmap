DISTDIR=editions/tidgraph/plugins/tidgraph
TARGETS=$(DISTDIR)/utils.js
PROD=yes

.PHONY: all clean serve

all: $(TARGETS)

clean:
	rm $(TARGETS)

serve: all
	bin/serve editions/tidgraph

editions/tidgraph/plugins/tidgraph/%.js: src/plugins/tidgraph/%.js
	if [ "$(PROD)" ]; then \
		sed -ne '\#/\*\\#,\#\\\*/# p' $^ > $@ && \
		closure $^ >> $@; \
	else \
	   cp $^  $@; \
	fi

